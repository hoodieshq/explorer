import { nextjsParameters } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';

import { NormalMetaplexNFTAttributesCard } from '../MetaplexNFTAttributesCard';

const METADATA_URI = 'https://example.test/nft-metadata.json';

const sampleAttributesJson = {
    attributes: [
        { trait_type: 'Background', value: 'Cosmic Purple' },
        { trait_type: 'Eyes', value: 'Laser' },
        { trait_type: 'Mouth', value: 'Smile' },
        { trait_type: 'Rarity Rank', value: 42 },
        { trait_type: 'Description', value: 'A long free-text value that wraps onto more lines on a phone' },
        { trait_type: 'Seed', value: '0x5f3c9a1e7b2d4c6f8a0e1b3d5c7f9a2e4b6d8f0a1c3e5b7d9f2a4c6e8b0d1f3' },
    ],
};

// Installs the fetch override at decorator render time (synchronously) so the inner
// component's mount-time useEffect sees the mock. No cleanup is needed — Storybook
// re-runs decorators per story and the next story's decorator replaces it.
function makeFetchOverride(body: unknown, ok = true): Decorator {
    const FetchOverride: Decorator = Story => {
        global.fetch = (async () =>
            ({
                json: async () => body,
                ok,
            }) as Response) as typeof fetch;
        return <Story />;
    };
    return FetchOverride;
}

const meta = {
    component: NormalMetaplexNFTAttributesCard,
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "The NFT's traits from its off-chain metadata JSON, in a collapsible section. Everything is",
                    'composed from the shared primitives below.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — the "Attributes" heading lifted out above the surface, a `Collapse`/`Expand` toggle, and the height animation. Passed `className=""` so the surface comes from the `<Card>` below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the Tailwind `variant="tight"` surface holding the list.',
                    '- Attributes grid — a pure-Tailwind CSS grid (`clamp(132px,25%,200px) 1fr`, the Slot Hashes tracks) built from `div`s with `role="table"`/`row`/`cell` for a11y. Trait types and values wrap on narrow screens, so the page never scrolls horizontally.',
                    '- `LoadingCard` / `ErrorCard` — the states while the metadata JSON loads or after it fails, with a retry.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/MetaplexNFTAttributesCard',
} satisfies Meta<typeof NormalMetaplexNFTAttributesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAttributes: Story = {
    args: { metadataUri: METADATA_URI },
    decorators: [makeFetchOverride(sampleAttributesJson)],
};

export const Empty: Story = {
    args: { metadataUri: METADATA_URI },
    decorators: [makeFetchOverride({ attributes: [] })],
};

export const MalformedResponse: Story = {
    args: { metadataUri: METADATA_URI },
    decorators: [makeFetchOverride({ attributes: 'not-an-array' })],
};
