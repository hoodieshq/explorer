import { gen } from '@__fixtures__/gen';
import { Cluster } from '@utils/cluster';
import { describe, expect, it } from 'vitest';

import { getTxOgImageUrl, getTxOpenGraph } from '../get-tx-open-graph';

const SIGNATURE = gen.signature(1);
// TX_OG_BASE_URL falls back to EXPLORER_BASE_URL when the env var is unset, which is the case under vitest.
const BASE_URL = 'https://explorer.solana.com';

describe('should build transaction Open Graph metadata', () => {
    it('should set type and url, the two tags whose absence stops Slack unfurling', () => {
        expect(getTxOpenGraph(SIGNATURE)).toMatchObject({
            type: 'website',
            url: `${BASE_URL}/tx/${SIGNATURE}`,
        });
    });

    it('should point the image at the og route with explicit 1200x630 dimensions', () => {
        expect(getTxOpenGraph(SIGNATURE)).toMatchObject({
            images: [{ height: 630, url: `${BASE_URL}/og/tx/${SIGNATURE}`, width: 1200 }],
        });
    });

    it('should omit the cluster param on mainnet', () => {
        expect(getTxOpenGraph(SIGNATURE, Cluster.MainnetBeta)).toMatchObject({
            images: [{ url: `${BASE_URL}/og/tx/${SIGNATURE}` }],
            url: `${BASE_URL}/tx/${SIGNATURE}`,
        });
    });

    it('should emit the cluster param in both urls for a non-mainnet cluster', () => {
        expect(getTxOpenGraph(SIGNATURE, Cluster.Devnet)).toMatchObject({
            images: [{ url: `${BASE_URL}/og/tx/${SIGNATURE}?cluster=devnet` }],
            url: `${BASE_URL}/tx/${SIGNATURE}?cluster=devnet`,
        });
    });

    it('should expose the same image url the twitter card reuses', () => {
        expect(getTxOgImageUrl(SIGNATURE)).toBe(`${BASE_URL}/og/tx/${SIGNATURE}`);
        expect(getTxOgImageUrl(SIGNATURE, Cluster.Testnet)).toBe(`${BASE_URL}/og/tx/${SIGNATURE}?cluster=testnet`);
    });
});
