import type { EditionInfo } from '@entities/nft';
import { isSome } from '@metaplex-foundation/umi';

// REVIEW(HOO-921): the data the header variants under review share. The regular and the compressed header both
// build it, so one set of variants serves both pages.

export type NftCreator = { address: string; verified: boolean; share: number };

/** A verified collection: its mint address, and its name once the collection NFT's metadata loads. */
export type NftCollection = { address: string; name?: string };

export type NftHeaderModel = {
    /** "Metaplex NFT", "Metaplex Compressed NFT" and so on. */
    typeLabel: string;
    image?: string;
    /** The name, or a placeholder when the metadata has none. */
    name: string;
    /** Undefined when the metadata has no symbol. */
    symbol?: string;
    /** Undefined when the NFT has no edition information. */
    edition?: string;
    /** Set only for a verified collection. */
    collection?: NftCollection;
    compressed: boolean;
    /** Regular NFTs only: compressed ones carry no primary-sale flag. */
    primarySaleHappened?: boolean;
    mutable: boolean;
    creators: NftCreator[] | null;
};

/**
 * The edition in collectors' words, for the header variants: whether the NFT is a one-of-one, a master and how many
 * prints it has, or a print and its number. Undefined without a master edition: `getEditionInfo` returns the same
 * empty result for an NFT without one and for a failed RPC call.
 */
export function getEditionSummary({ edition, masterEdition }: EditionInfo): string | undefined {
    if (!masterEdition) return undefined;
    const maxSupply = isSome(masterEdition.maxSupply) ? Number(masterEdition.maxSupply.value) : undefined;
    if (edition) {
        const number = Number(edition.edition);
        return maxSupply === undefined ? `Print ${number}, open edition` : `Print ${number} of ${maxSupply}`;
    }
    const printed = Number(masterEdition.supply);
    if (maxSupply === undefined) return `Master · ${printed} printed, open edition`;
    return maxSupply === 0 ? '1/1' : `Master · ${printed} of ${maxSupply} printed`;
}
