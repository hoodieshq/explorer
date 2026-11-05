import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { userEvent, within } from 'storybook/test';

import { TokenExtensionsCard } from '../TokenExtensionsCard';
import { MINT_ADDRESS, TOKEN_EXTENSIONS, withTokenInfoSkipped } from './token-extensions-fixtures';

// Known: switching between Mobile/Tablet variants has a brief lag from viewport addon iframe resize + remount.
const meta = {
    component: TokenExtensionsCard,
    decorators: [withTokenInfoSkipped, withViewportFromGlobal, withClusterAndAccounts, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/TokenExtensionsCard@Media',
} satisfies Meta<typeof TokenExtensionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    address: MINT_ADDRESS,
    decimals: 6,
    extensions: TOKEN_EXTENSIONS,
};

// Opens Token Metadata: it holds the longest values (URI, additional metadata) next to addresses. A tap
// on the row opens the drawer on a phone and expands the row in place on a tablet, which gets the desktop table
// from `md`.
const play: Story['play'] = async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Token Metadata'));
};

export const Mobile: Story = {
    args,
    globals: { viewport: { value: 'iphonex' } },
    play,
};

export const TabletPortrait: Story = {
    args,
    globals: { viewport: { value: 'ipad' } },
    play,
};

export const TabletLandscape: Story = {
    args,
    globals: { viewport: { isRotated: true, value: 'ipad' } },
    play,
};
