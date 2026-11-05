import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-928): no mainnet mint carries metadata both in its Token-2022 extension and in a Metaplex account, so
// the review-only design menu can add a made-up Metaplex source to show the two-tab case on a preview. Remove with
// the menu.

// On by default, so a reviewer opening a preview sees the two tabs at once. Only a reviewer's flip is stored.
export const mockMetaplexAtom = atomWithStorage('hoo-928:mock-metaplex', true);

/**
 * A Metaplex metadata account shaped like the decoded one, filled from the mint's own Token-2022 metadata. Fields a
 * fungible token's account leaves empty (collection, creators, uses…) are left out.
 */
export function mockMetaplexMetadata(tokenMetadata: Record<string, unknown>): object {
    return {
        editionNonce: 255,
        isMutable: true,
        key: 4,
        mint: tokenMetadata.mint,
        name: tokenMetadata.name,
        primarySaleHappened: false,
        sellerFeeBasisPoints: 0,
        symbol: tokenMetadata.symbol,
        tokenStandard: 2,
        updateAuthority: tokenMetadata.updateAuthority,
        uri: tokenMetadata.uri,
    };
}
