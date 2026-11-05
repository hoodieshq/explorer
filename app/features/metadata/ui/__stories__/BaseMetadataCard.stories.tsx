import { withClipboardMock } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseMetadataCard, type MetadataSection } from '../BaseMetadataCard';

const meta = {
    component: BaseMetadataCard,
    decorators: [withClipboardMock],
    parameters: {
        docs: {
            description: {
                component: [
                    'The Metadata tab of an address: one «Metadata» section, like the page tab, on a card laid out like',
                    "the MCP docs page's. Several sources get tabs in the card's header; a single source gets its name",
                    "styled as the active tab instead. The copy button for the whole JSON sits at the header's end. The sources:",
                    '',
                    '- **Token extension** — the `tokenMetadata` extension of a Token-2022 mint.',
                    '- **Metaplex** — the Metaplex metadata account of a mint, as decoded by `mpl-token-metadata`.',
                    '- **Compressed NFT Metadata** — the off-chain JSON of a compressed NFT.',
                    '',
                    'A Token-2022 mint can carry both the extension and a Metaplex account; then it shows two tabs. No',
                    'such mint was found on mainnet, so that story uses a local mock. With no source at all the tab',
                    'shows the shared error card.',
                    '',
                    'REVIEW(HOO-928): `layout="sections"` is kept for comparison: every source its own collapsible',
                    'section, one after another. The design menu switches the live page between the two.',
                    '',
                    'The examples are live mainnet accounts; the story comment names each address.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — the heading above each surface with the Collapse/Expand toggle. Passed `className=""` so the surface comes from the `Card` below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the surface: `variant="tight"` with the outer-space border and background.',
                    '- [JsonViewer](?path=/docs/components-common-jsonviewer--docs) — `version="v2"`: the JSON tree with a copy button for the whole block in the corner and one after the text of each row on hover.',
                    '- [CardTabs](?path=/docs/shared-cardtabs--docs) — the card tabs with `look="plain"` (the regular tabs\' font and colors) in the card\'s header.',
                    '- [BaseAttestationDataCard](?path=/docs/components-account-baseattestationdatacard--docs) — the same section, surface and padding on the Attestation Service tab.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/Metadata/BaseMetadataCard',
} satisfies Meta<typeof BaseMetadataCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const tokenExtension = (data: object): MetadataSection => ({ data, id: 'token-metadata', title: 'Token extension' });
const metaplex = (data: object): MetadataSection => ({ data, id: 'metaplex-metadata', title: 'Metaplex' });

// PYUSD 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo: Token-2022 extension only, no additional metadata.
export const TokenExtension: Story = {
    args: {
        sections: [
            tokenExtension({
                additionalMetadata: [],
                mint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
                name: 'PayPal USD',
                symbol: 'PYUSD',
                updateAuthority: '2apBGMsS6ti9RyF5TwQTDswXBWskiJP2LD4cUEDqYJjk',
                uri: 'https://token-metadata.paxos.com/pyusd_metadata/prod/solana/pyusd_metadata.json',
            }),
        ],
    },
};

// Elements #8142 6H49BjeAGsXeof5HbLqADmHpCXVFapFe6PMVNxruJpi4: additional metadata as key–value pairs, one key
// an address.
export const TokenExtensionWithAdditionalMetadata: Story = {
    args: {
        sections: [
            tokenExtension({
                additionalMetadata: [
                    ['royalty_basis_points', '500'],
                    ['5AdNuK2RfGxKhk7gGQZxN6S4a5LNRUn8Q1ry6fSWg85n', '100'],
                ],
                mint: '6H49BjeAGsXeof5HbLqADmHpCXVFapFe6PMVNxruJpi4',
                name: 'Elements #8142',
                symbol: 'ELMNTS',
                updateAuthority: '5AdNuK2RfGxKhk7gGQZxN6S4a5LNRUn8Q1ry6fSWg85n',
                uri: 'https://storage.googleapis.com/assetdash-elements-collection/meta/8142.json',
            }),
        ],
    },
};

// ZBB #2556 13vudpRiKaMRg1fif48NkAQF3o4B9EsBbWwfRKyc64VE: a pNFT's Metaplex account with its account header,
// creators, collection and programmable config.
export const Metaplex: Story = {
    args: {
        sections: [
            metaplex({
                collection: { key: '37nGhj3rffAwTHMoCm3HSByM3eYFi1N5x1ED2ZuakgC3', verified: true },
                collectionDetails: null,
                creators: [
                    { address: '9W9kivfHuxty3dWZEnnFswXWakhH48LDjNMMU2wgpvPf', share: 0, verified: true },
                    { address: 'D47KLr3JcT1CCG7drtmrzDBfQ2tWRyM9qKmAMN1pv8CN', share: 100, verified: false },
                ],
                editionNonce: 254,
                header: {
                    executable: false,
                    exists: true,
                    lamports: { basisPoints: '3733800', decimals: 9, identifier: 'SOL' },
                    owner: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
                    rentEpoch: '18446744073709551616',
                },
                isMutable: true,
                key: 4,
                mint: '13vudpRiKaMRg1fif48NkAQF3o4B9EsBbWwfRKyc64VE',
                name: 'ZBB #2556',
                primarySaleHappened: true,
                programmableConfig: { __kind: 'V1', ruleSet: 'eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9' },
                publicKey: 'HeB9rgExDEdHZtFAf4Wdzoaed1xSELinRJeSrtzPe2H7',
                sellerFeeBasisPoints: 500,
                symbol: 'ZBB',
                tokenStandard: 4,
                updateAuthority: 'D47KLr3JcT1CCG7drtmrzDBfQ2tWRyM9qKmAMN1pv8CN',
                uri: 'https://nftstorage.link/ipfs/bafybeif37ezxcjadjy6jevcgjdv45sn3ltyxw3y4y6i4co2xwd3ba6vrhi/2556.json',
                uses: null,
            }),
        ],
    },
};

// Local mock GxqBtcSK47NYtL67mjtVF4NdRogf2fBn4scN8pAgD6WH (served by the dev RPC proxy): a Token-2022 mint with
// metadata in both its extension and a Metaplex account, so the two sections stack.
export const TokenExtensionAndMetaplex: Story = {
    args: {
        sections: [
            tokenExtension({
                additionalMetadata: [
                    ['description', 'Mock mint with metadata in its Token-2022 extension and in a Metaplex account'],
                    ['website', 'https://example.com'],
                ],
                mint: 'GxqBtcSK47NYtL67mjtVF4NdRogf2fBn4scN8pAgD6WH',
                name: 'Two Sources Token',
                symbol: 'TWOSRC',
                updateAuthority: '8pun5NVDCwS2NyAToawWaoxni6k6FQmAe42ZWPfr6p6n',
                uri: '',
            }),
            metaplex({
                collection: null,
                collectionDetails: null,
                creators: [{ address: '8pun5NVDCwS2NyAToawWaoxni6k6FQmAe42ZWPfr6p6n', share: 100, verified: true }],
                editionNonce: 255,
                isMutable: true,
                key: 4,
                mint: 'GxqBtcSK47NYtL67mjtVF4NdRogf2fBn4scN8pAgD6WH',
                name: 'Two Sources Token',
                primarySaleHappened: false,
                programmableConfig: null,
                publicKey: 'EEWwAT9M5jgPUQqNfqsk4AK7mCLZerVzxF2PYPJwGm3u',
                sellerFeeBasisPoints: 0,
                symbol: 'TWOSRC',
                tokenStandard: 2,
                updateAuthority: '8pun5NVDCwS2NyAToawWaoxni6k6FQmAe42ZWPfr6p6n',
                uri: '',
                uses: null,
            }),
        ],
    },
};

// Terra Shard VKg8BUaSvxXeYiidc5ukeNaxhcxyqW4oQSNfcZ3AqZT: a compressed NFT's off-chain JSON with long S3 URIs.
export const CompressedNft: Story = {
    args: {
        sections: [
            {
                data: {
                    attributes: [
                        { trait_type: 'Type', value: 'Terra' },
                        { trait_type: 'Artist', value: '@arthur_vista' },
                    ],
                    collection: { name: 'Terra Shard' },
                    description: 'Key ingredient needed to forge a Mage Tensorian.',
                    external_url: 'https://www.tensor.trade/',
                    image: 'https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/85c928a2-4871-4eef-a5e0-ebe511c53c0d/images/terra.gif',
                    name: 'Terra Shard',
                    properties: {
                        category: 'image',
                        collection: { family: 'TSHRD', name: 'Tensorian Shards' },
                        creators: [{ address: '6SaLn1T9LJMk7NeNZDJYNBekSTN5hDgTvs6SDGPQXvfb', share: 100 }],
                        files: [
                            {
                                id: 'gif',
                                type: 'image/gif',
                                uri: 'https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/85c928a2-4871-4eef-a5e0-ebe511c53c0d/images/terra.gif',
                            },
                            {
                                id: 'png',
                                type: 'image/png',
                                uri: 'https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/85c928a2-4871-4eef-a5e0-ebe511c53c0d/images/terra.png',
                            },
                        ],
                    },
                    symbol: 'TSHRD',
                },
                id: 'compressed-nft-metadata',
                title: 'Compressed NFT Metadata',
            },
        ],
    },
};

// REVIEW(HOO-928): the sections layout, kept for comparison: two sources as two sections.
export const SectionsLayoutTwoSources: Story = {
    args: { ...TokenExtensionAndMetaplex.args, layout: 'sections' },
};

export const NoMetadata: Story = {
    args: { sections: [] },
};
