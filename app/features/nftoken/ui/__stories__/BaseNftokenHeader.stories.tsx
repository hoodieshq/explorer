import type { Meta, StoryObj } from '@storybook-config/types';

import solanaHero from '@/app/components/shared/ui/image/__stories__/solana_hero_generated.jpg';

import type { CollectionNftsState } from '../../model/use-collection-nfts';
import { BaseNftokenHeader } from '../BaseNftokenHeader';

const meta = {
    component: BaseNftokenHeader,
    tags: ['autodocs', 'test'],
    title: 'Features/NFToken/NftokenHeader',
} satisfies Meta<typeof BaseNftokenHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const loaded = {
    kind: 'loaded',
    metadata: {
        description:
            'The Genesis collection for friends.glow. These are the first NFTs they have minted, but surely won’t be the last.',
        image: solanaHero.src,
        name: 'Genesis: friends.glow',
    },
} as const;

const collection = {
    address: 'D2VpbKpT725tdQyaNNZZwwS7Mqzgw4SZb2o4az5wA9vr',
    href: '/address/D2VpbKpT725tdQyaNNZZwwS7Mqzgw4SZb2o4az5wA9vr',
    name: 'Genesis: friends.glow',
};

export const Nft: Story = {
    args: { collection, kind: 'nft', metadata: loaded },
};

export const NftCollectionLoading: Story = {
    args: { collection: { ...collection, name: undefined }, kind: 'nft', metadata: loaded },
};

export const NftWithoutCollection: Story = {
    args: { kind: 'nft', metadata: loaded },
};

const counted: CollectionNftsState = {
    kind: 'loaded',
    nfts: [],
    refreshFailed: false,
    refreshing: false,
    undecodableCount: 621,
};

export const Collection: Story = {
    args: { kind: 'collection', metadata: loaded, nfts: counted },
};

export const CollectionCounting: Story = {
    args: { kind: 'collection', metadata: loaded, nfts: { kind: 'loading' } },
};

export const CollectionCountFailed: Story = {
    args: { kind: 'collection', metadata: loaded, nfts: { kind: 'failed' } },
};

// REVIEW(HOO-929): the layouts under comparison in the design menu.
export const NftCard: Story = {
    args: { collection, kind: 'nft', metadata: loaded, variant: 'card' },
};

export const CollectionCard: Story = {
    args: { kind: 'collection', metadata: loaded, nfts: counted, variant: 'card' },
};

export const NftSplit: Story = {
    args: { collection, kind: 'nft', metadata: loaded, variant: 'split' },
};

export const CollectionSplit: Story = {
    args: { ...CollectionCard.args, variant: 'split' },
};

export const NftSplitOriginalRow: Story = {
    args: { ...NftSplit.args, originalLink: 'row' },
};

export const LoadingCard: Story = {
    args: { kind: 'collection', metadata: { kind: 'loading' }, nfts: { kind: 'loading' }, variant: 'card' },
};

export const Loading: Story = {
    args: { kind: 'collection', metadata: { kind: 'loading' }, nfts: { kind: 'loading' } },
};

export const MetadataUnavailable: Story = {
    args: { kind: 'collection', metadata: { kind: 'unavailable' } },
};

export const MetadataFailed: Story = {
    args: { kind: 'collection', metadata: { kind: 'failed' } },
};
