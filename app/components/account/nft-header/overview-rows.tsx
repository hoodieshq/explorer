import type { NftHeaderModel } from '@/app/components/account/nft-header/model';
import { MutabilityHint, NftCreatorsList } from '@/app/components/account/nft-header/NftHeaderVariants';
import type { KeyValueRowInput } from '@/app/shared/ui/key-value';

// REVIEW(HOO-921): the Overview rows that take over what the header variants drop.

/** The Market and Metadata rows the header variants leave to the Overview card. */
export function nftOverviewRows(model: NftHeaderModel): KeyValueRowInput[] {
    return [
        model.primarySaleHappened !== undefined && {
            label: 'Market',
            value: model.primarySaleHappened ? 'Secondary Market' : 'Primary Market',
        },
        { label: 'Metadata', value: <MutabilityHint mutable={model.mutable} /> },
    ];
}

/** The Creators row, for when the design menu moves the creators from the header to the Overview card. */
export function nftCreatorsOverviewRow(model: Pick<NftHeaderModel, 'creators'>): KeyValueRowInput {
    return { label: 'Creators', value: <NftCreatorsList creators={model.creators} /> };
}
