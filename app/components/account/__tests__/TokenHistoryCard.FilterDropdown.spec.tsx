import { PublicKey } from '@solana/web3.js';
import { fireEvent, render, screen } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const USDC_LABEL = 'USDC - USD Coin';
// No metadata for BONK: a 10-char prefix + ellipsis, matching TRUNCATE_TOKEN_LENGTH.
const BONK_LABEL = `${BONK.slice(0, 10)}…`;
let search = '';

vi.mock('next/navigation', () => ({
    usePathname: () => '/address/x/tokens',
    useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@providers/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@providers/cluster')>();
    return { ...actual, useCluster: () => ({ cluster: Cluster.MainnetBeta, genesisHash: 'genesis' }) };
});

// The filter labels come from one bulk lookup; only USDC resolves, so BONK exercises the fallback label.
const { useTokenInfosMock } = vi.hoisted(() => ({ useTokenInfosMock: vi.fn() }));
vi.mock('@entities/token-info/client', () => ({ useTokenInfos: useTokenInfosMock }));

import { readTokenHistoryFilter, toggleTokenHistoryFilter, TokenHistorySection } from '../TokenHistoryCard';

describe('should lay out the Token History header like the block transactions header', () => {
    beforeEach(() => {
        search = 'cluster=devnet';
        useTokenInfosMock.mockReturnValue({
            isLoading: false,
            tokenInfos: new Map([[USDC, { address: USDC, decimals: 6, name: 'USD Coin', symbol: 'USDC' }]]),
        });
    });

    it('should count records and show no chips when no filter is set', () => {
        renderSection(12);

        expect(screen.getByText('12 records')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: `Clear token filter: ${USDC_LABEL}` })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Clear status filter: Failed' })).not.toBeInTheDocument();
    });

    it('should label the token chip from the bulk lookup and clear it without dropping other params', () => {
        search = `filter=${USDC}&status=failed&cluster=devnet`;
        renderSection(3);

        expect(screen.getByText('3 filtered records')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: `Clear token filter: ${USDC_LABEL}` })).toHaveAttribute(
            'href',
            '/address/x/tokens?status=failed&cluster=devnet',
        );
        expect(screen.getByRole('link', { name: 'Clear status filter: Failed' })).toHaveAttribute(
            'href',
            `/address/x/tokens?filter=${USDC}&cluster=devnet`,
        );
    });

    it('should fall back to a truncated mint when the lookup has no metadata', () => {
        search = `filter=${BONK}`;
        renderSection(1);

        expect(screen.getByRole('link', { name: `Clear token filter: ${BONK_LABEL}` })).toBeInTheDocument();
    });

    it('should show one chip per filtered token, each clearing only its own mint', () => {
        search = `cluster=devnet&filter=${USDC}&filter=${BONK}`;
        renderSection(4);

        expect(screen.getByRole('link', { name: `Clear token filter: ${USDC_LABEL}` })).toHaveAttribute(
            'href',
            `/address/x/tokens?cluster=devnet&filter=${BONK}`,
        );
        expect(screen.getByRole('link', { name: `Clear token filter: ${BONK_LABEL}` })).toHaveAttribute(
            'href',
            `/address/x/tokens?cluster=devnet&filter=${USDC}`,
        );
    });

    it('should link the Status options and add a Token option to the selection', () => {
        search = `cluster=devnet&filter=${USDC}`;
        renderSection(2);
        fireEvent.click(screen.getByRole('button', { name: 'Filters' }));

        expect(screen.getByRole('link', { name: 'Failed' })).toHaveAttribute(
            'href',
            `/address/x/tokens?cluster=devnet&filter=${USDC}&status=failed`,
        );
        // Selected USDC toggles out; unselected BONK joins it.
        expect(screen.getByRole('link', { name: USDC_LABEL })).toHaveAttribute(
            'href',
            '/address/x/tokens?cluster=devnet',
        );
        expect(screen.getByRole('link', { name: BONK_LABEL })).toHaveAttribute(
            'href',
            `/address/x/tokens?cluster=devnet&filter=${USDC}&filter=${BONK}`,
        );
        expect(screen.getByRole('link', { name: 'All Tokens' })).toHaveAttribute(
            'href',
            '/address/x/tokens?cluster=devnet',
        );
    });

    it('should narrow the Token options by label or mint address', () => {
        renderSection(2);
        const input = screen.getByPlaceholderText('Token');

        // No filter is set, so there are no chips: every token label on screen is a menu option.
        fireEvent.change(input, { target: { value: 'usd' } });
        expect(screen.getByRole('link', { name: USDC_LABEL })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: BONK_LABEL })).not.toBeInTheDocument();

        fireEvent.change(input, { target: { value: BONK.slice(0, 6) } });
        expect(screen.getByRole('link', { name: BONK_LABEL })).toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'nothing-like-this' } });
        expect(screen.getByText('No matches')).toBeInTheDocument();
    });
});

describe('should keep the token filter as repeated params', () => {
    it('should read every mint once, in the order added', () => {
        expect(readTokenHistoryFilter(new URLSearchParams(`filter=${USDC}&filter=${BONK}&filter=${USDC}`))).toEqual([
            USDC,
            BONK,
        ]);
        expect(readTokenHistoryFilter(new URLSearchParams('cluster=devnet'))).toEqual([]);
    });

    it('should add a mint, remove it again, and drop the param once empty', () => {
        const params = new URLSearchParams('cluster=devnet');

        toggleTokenHistoryFilter(params, USDC);
        toggleTokenHistoryFilter(params, BONK);
        expect(params.getAll('filter')).toEqual([USDC, BONK]);

        toggleTokenHistoryFilter(params, USDC);
        expect(params.getAll('filter')).toEqual([BONK]);

        toggleTokenHistoryFilter(params, BONK);
        expect(params.toString()).toBe('cluster=devnet');
    });
});

function renderSection(recordCount: number) {
    const params = new URLSearchParams(search);
    const status = params.get('status');
    return render(
        <TokenHistorySection
            tokens={[tokenFor(USDC), tokenFor(BONK)] as any}
            mints={readTokenHistoryFilter(params)}
            status={status === 'failed' || status === 'succeeded' ? status : null}
            recordCount={recordCount}
            fetching={false}
            onRefresh={() => undefined}
        >
            <div />
        </TokenHistorySection>,
    );
}

function tokenFor(mint: string) {
    return {
        info: {
            mint: new PublicKey(mint),
            tokenAmount: { amount: '1', decimals: 0, uiAmountString: '1' },
        },
        pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    };
}
