import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cluster } from '@utils/cluster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const OWNER = '11111111111111111111111111111111';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const ACCOUNT = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SIGNATURES = ['sig-newer', 'sig-older'];

vi.mock('next/navigation', () => ({
    usePathname: () => '/address/x/tokens',
    useSearchParams: () => new URLSearchParams(),
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
            data: {
                tokens: [
                    {
                        info: {
                            isNative: false,
                            mint: new PublicKey(MINT),
                            owner: new PublicKey(OWNER),
                            state: 'initialized',
                            tokenAmount: { amount: '1', decimals: 0, uiAmountString: '1' },
                        },
                        pubkey: new PublicKey(ACCOUNT),
                    },
                ],
            },
            status: FetchStatus.Fetched,
        }),
    };
});

// Both rows of history already fetched in full, so nothing is requested and no footer button competes.
vi.mock('@features/transaction-history/model/use-account-history', () => ({
    useAccountHistories: () => ({
        [ACCOUNT]: {
            data: {
                fetched: SIGNATURES.map((signature, index) => ({
                    blockTime: 1_700_000_000 - index,
                    confirmationStatus: 'finalized',
                    err: index === 1 ? { InstructionError: [0, 'Custom'] } : null,
                    memo: null,
                    signature,
                    slot: 1_000 - index,
                })),
                foundOldest: true,
            },
            status: FetchStatus.Fetched,
        },
    }),
}));
vi.mock('@features/transaction-history/model/use-fetch-account-history', () => ({
    useFetchAccountHistory: () => vi.fn(),
}));
vi.mock('@features/transaction-history/model/use-resolved-instruction-summaries', () => ({
    useResolvedInstructionSummaries: () => [],
}));
vi.mock('@features/transaction-history/ui/TransactionDetailsDrawer', () => ({
    TransactionDetailsDrawer: ({ open, signature, statusLabel }: any) =>
        open ? (
            <div role="dialog" aria-label={`Transaction ${signature}`}>
                {statusLabel}
            </div>
        ) : null,
}));

// Variant 2.1's Size column reads the raw transaction; nothing needs to load for these specs.
vi.mock('@providers/transactions/raw', () => ({
    useFetchRawTransaction: () => vi.fn(),
    useRawTransactionDetails: () => undefined,
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
vi.mock('@features/metadata', () => ({ ProxiedImage: () => null }));

// Stubs that expose the props deciding whether a value is interactive (a link, a copy glyph, a nickname editor).
vi.mock('@components/common/Signature', () => ({
    Signature: ({ signature, link, noCopy }: any) => (
        <span data-testid="signature" data-link={String(Boolean(link))} data-no-copy={String(Boolean(noCopy))}>
            {signature}
        </span>
    ),
}));
vi.mock('@components/common/Slot', () => ({
    Slot: ({ slot, link }: any) => (
        <span data-testid="slot" data-link={String(Boolean(link))}>
            {slot}
        </span>
    ),
}));
vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey, link, noCopy, noNicknameEditing }: any) => (
        <span
            data-testid="address"
            data-link={String(Boolean(link))}
            data-no-copy={String(Boolean(noCopy))}
            data-no-nickname-editing={String(Boolean(noNicknameEditing))}
        >
            {pubkey.toBase58()}
        </span>
    ),
}));

import { TokenHistoryCard } from '../TokenHistoryCard';

describe('should render variant 2.2 transactions as tap-to-open cards on mobile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should render one card per transaction with no link, copy glyph or nickname editor inside', () => {
        renderCompact();

        // The grid renders the mobile cards and the desktop table side by side (CSS picks one); the cards are
        // the plain copies.
        const cardSignatures = mobile('signature');
        expect(cardSignatures.map(node => node.textContent)).toEqual(SIGNATURES);
        cardSignatures.forEach(node => expect(node).toHaveAttribute('data-link', 'false'));

        const cardSlots = screen.getAllByTestId('slot').filter(node => node.getAttribute('data-link') === 'false');
        expect(cardSlots).toHaveLength(SIGNATURES.length);

        const cardTokens = mobile('address');
        expect(cardTokens).toHaveLength(SIGNATURES.length);
        cardTokens.forEach(node => {
            expect(node).toHaveAttribute('data-link', 'false');
            expect(node).toHaveAttribute('data-no-nickname-editing', 'true');
        });
    });

    it('should open the transaction drawer when the card is tapped', async () => {
        renderCompact();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await userEvent.click(mobile('signature')[1]);

        expect(screen.getByRole('dialog', { name: 'Transaction sig-older' })).toHaveTextContent('Failed');
    });

    it('should leave variant 2.1 rows interactive', () => {
        render(<TokenHistoryCard address={OWNER} layout="grid" variant="tx-history" />);

        expect(mobile('signature')).toHaveLength(0);
        expect(mobile('address')).toHaveLength(0);
    });
});

function renderCompact() {
    return render(<TokenHistoryCard address={OWNER} layout="grid" variant="tx-history-compact" />);
}

// The no-copy stubs: only the mobile cards render them.
function mobile(testId: 'signature' | 'address') {
    return screen.queryAllByTestId(testId).filter(node => node.getAttribute('data-no-copy') === 'true');
}
