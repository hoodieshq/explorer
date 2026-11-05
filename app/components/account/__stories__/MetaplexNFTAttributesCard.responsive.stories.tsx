import { nextjsParameters } from '@storybook-config/decorators';
import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
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

const withFetchOverride: Decorator = Story => {
    global.fetch = (async () => ({ json: async () => sampleAttributesJson, ok: true }) as Response) as typeof fetch;
    return <Story />;
};

const meta: Meta<typeof NormalMetaplexNFTAttributesCard> = {
    component: NormalMetaplexNFTAttributesCard,
    decorators: [withFetchOverride, withViewportFromGlobal],
    parameters: {
        ...nextjsParameters,
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/MetaplexNFTAttributesCard@Media',
};

export default meta;
type Story = StoryObj<typeof meta>;

const args = { metadataUri: METADATA_URI };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
