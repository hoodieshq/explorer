import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cluster } from '@utils/cluster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const OWNER = '11111111111111111111111111111111';
const MINT_A = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MINT_B = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const ACCOUNT_A = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ACCOUNT_B = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

let search = '';
let histories: Record<string, unknown> = {};

vi.mock('next/navigation', () => ({
    usePathname: () => '/address/x/tokens',
    useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@providers/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@providers/cluster')>();
    return { ...actual, useCluster: () => ({ cluster: Cluster.MainnetBeta, genesisHash: 'genesis', url: 'rpc' }) };
});

vi.mock('@providers/accounts/tokens', async importOriginal => {
    const actual = await importOriginal<typeof import('@providers/accounts/tokens')>();
    return {
        ...actual,
        useAccountOwnedTokens: () => ({
            data: { tokens: [token(ACCOUNT_A, MINT_A), token(ACCOUNT_B, MINT_B)] },
            status: FetchStatus.Fetched,
        }),
    };
});

// The history cache is driven straight from `histories`; the fetcher only records what the card asks for.
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock('@features/transaction-history/model/use-account-history', () => ({
    useAccountHistories: () => histories,
}));
vi.mock('@features/transaction-history/model/use-fetch-account-history', () => ({
    useFetchAccountHistory: () => fetchMock,
}));
vi.mock('@features/transaction-history/model/use-resolved-instruction-summaries', () => ({
    useResolvedInstructionSummaries: () => [],
}));

vi.mock('@providers/transactions/parsed', async importOriginal => {
    const actual = await importOriginal<typeof import('@providers/transactions/parsed')>();
    return { ...actual, useTransactionDetailsCache: () => ({}) };
});

vi.mock('@entities/token-info', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/token-info')>();
    return { ...actual, useTokenInfo: () => undefined };
});
vi.mock('@entities/token-info/client', () => ({ useTokenInfos: () => ({ isLoading: false, tokenInfos: new Map() }) }));

vi.mock('@/app/shared/lib/visibility', () => ({ useVisibility: () => ({ isVisible: false, ref: () => undefined }) }));

vi.mock('@components/common/Signature', () => ({
    Signature: ({ signature }: { signature: string }) => <span data-testid="signature">{signature}</span>,
}));
vi.mock('@components/common/Slot', () => ({ Slot: ({ slot }: { slot: number }) => <span>{slot}</span> }));
vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey }: { pubkey: PublicKey }) => <span>{pubkey.toBase58()}</span>,
}));
vi.mock('@features/metadata', () => ({ ProxiedImage: () => null }));

import { TokenHistoryCard } from '../TokenHistoryCard';

describe('should page Token History 20 rows at a time across the whole history', () => {
    beforeEach(() => {
        search = '';
        histories = {};
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch the newest page of every token account on mount', () => {
        renderCard();

        expect(fetchMock).toHaveBeenCalledWith(ACCOUNT_A, false, true);
        expect(fetchMock).toHaveBeenCalledWith(ACCOUNT_B, false, true);
        expect(screen.getByText('Loading history')).toBeInTheDocument();
    });

    it('should show the newest 20 rows behind a plain Load More, then reveal the rest and fetch older pages', async () => {
        histories = {
            [ACCOUNT_A]: fetched(signatures('a', 25, 1_000), false),
            [ACCOUNT_B]: fetched([], true),
        };
        renderCard();

        expect(visibleSignatures()).toHaveLength(20);
        const loadMore = screen.getByRole('button', { name: 'Load More' });
        expect(fetchMock).not.toHaveBeenCalled();

        await userEvent.click(loadMore);

        expect(visibleSignatures()).toHaveLength(25);
        // 25 rows against a target of 40, with A's history not exhausted: the card fetches A's next page.
        expect(fetchMock).toHaveBeenCalledWith(ACCOUNT_A, false, undefined);
        expect(fetchMock).not.toHaveBeenCalledWith(ACCOUNT_B, false, undefined);
    });

    it('should end on "Fetched full history" once every account is exhausted', () => {
        histories = {
            [ACCOUNT_A]: fetched(signatures('a', 3, 1_000), true),
            [ACCOUNT_B]: fetched(signatures('b', 2, 500), true),
        };
        renderCard();

        expect(visibleSignatures()).toHaveLength(5);
        expect(screen.getByText('Fetched full history')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
    });

    it("should fetch only the filtered tokens' accounts, so the filter reaches their whole history", () => {
        search = `filter=${MINT_B}`;
        histories = { [ACCOUNT_A]: fetched(signatures('a', 25, 1_000), false) };
        renderCard();

        expect(fetchMock).toHaveBeenCalledWith(ACCOUNT_B, false, true);
        expect(fetchMock).not.toHaveBeenCalledWith(ACCOUNT_A, expect.anything(), expect.anything());
    });

    it('should keep fetching older pages while too few rows match the status filter', () => {
        search = 'status=failed';
        histories = {
            [ACCOUNT_A]: fetched(signatures('a', 20, 1_000), false),
            [ACCOUNT_B]: fetched([], true),
        };
        renderCard();

        expect(fetchMock).toHaveBeenCalledWith(ACCOUNT_A, false, undefined);
        expect(screen.getByText('Loading history')).toBeInTheDocument();
    });
});

function renderCard() {
    return render(<TokenHistoryCard address={OWNER} layout="grid" variant="tx-history-compact" />);
}

// The compact grid renders a mobile and a desktop copy of every row, so count distinct signatures.
function visibleSignatures() {
    return [...new Set(screen.queryAllByTestId('signature').map(node => node.textContent))];
}

function token(pubkey: string, mint: string) {
    return {
        info: {
            isNative: false,
            mint: new PublicKey(mint),
            owner: new PublicKey(OWNER),
            state: 'initialized',
            tokenAmount: { amount: '1', decimals: 0, uiAmountString: '1' },
        },
        pubkey: new PublicKey(pubkey),
    };
}

// `count` successful signatures, newest first, one slot apart starting at `topSlot`.
function signatures(prefix: string, count: number, topSlot: number) {
    return Array.from({ length: count }, (_, index) => ({
        blockTime: 1_700_000_000 - index,
        confirmationStatus: 'finalized',
        err: null,
        memo: null,
        signature: `${prefix}-sig-${index}`,
        slot: topSlot - index,
    }));
}

function fetched(rows: ReturnType<typeof signatures>, foundOldest: boolean) {
    return { data: { fetched: rows, foundOldest }, status: FetchStatus.Fetched };
}
