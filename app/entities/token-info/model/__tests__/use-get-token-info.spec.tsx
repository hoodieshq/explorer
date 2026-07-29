import { render, screen } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { getTokenInfoSwrKey } from '@utils/token-info';
import React from 'react';
import { mutate } from 'swr';
import { afterEach, describe, expect, it } from 'vitest';

import { useGetTokenInfo } from '../use-token-info';

const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const KEY = getTokenInfoSwrKey(MINT, Cluster.MainnetBeta, 'genesis');

function Harness() {
    // Note: no TokenInfoBatchProvider wrapper - proves this hook never touches the batch path.
    const info = useGetTokenInfo(MINT, Cluster.MainnetBeta, 'genesis');
    return <span data-testid="symbol">{info?.symbol ?? 'none'}</span>;
}

describe('should read cached token info without triggering a request', () => {
    afterEach(async () => {
        await mutate(KEY, undefined, false);
    });

    it('should return undefined when the mint is not cached and need no batch provider', () => {
        render(<Harness />);
        expect(screen.getByTestId('symbol').textContent).toBe('none');
    });

    it('should return the cached token info seeded on its SWR key', async () => {
        await mutate(KEY, { address: MINT, symbol: 'USDC' } as any, false);
        render(<Harness />);
        expect(screen.getByTestId('symbol').textContent).toBe('USDC');
    });
});
