import type { TokenInfo } from './types';

/**
 * Orders mints so the ones a holder is likely to care about come first: mints the
 * unified token list (UTL) marks verified, then mints it lists without verifying,
 * then mints it does not know at all.
 *
 * Holdings arrive from the RPC in an arbitrary order, and an account can hold
 * hundreds of airdropped mints — one address in HOO-974 holds 1051, of which 78 are
 * verified — so without this the first screen is effectively random. Nothing is
 * dropped: every mint still appears, just further down.
 *
 * Bucketing rather than a comparator keeps the order stable by construction. Mints
 * keep their incoming order inside a tier, so the same holdings always render the
 * same way, and a mint whose metadata never resolved sorts as unknown rather than
 * jumping around.
 */
export function orderMintsByVerification(
    mints: readonly string[],
    tokenInfos: ReadonlyMap<string, TokenInfo>,
): string[] {
    const verified: string[] = [];
    const listed: string[] = [];
    const unlisted: string[] = [];

    for (const mint of mints) {
        const info = tokenInfos.get(mint);
        if (!info) {
            unlisted.push(mint);
        } else if (info.verified) {
            verified.push(mint);
        } else {
            listed.push(mint);
        }
    }

    return [...verified, ...listed, ...unlisted];
}
