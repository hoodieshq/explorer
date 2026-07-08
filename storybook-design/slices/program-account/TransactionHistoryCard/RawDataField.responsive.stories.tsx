import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { userEvent, within } from 'storybook/test';

import { RawDataField } from './RawDataField';
import { MOCK_DATA_LARGE, MOCK_FILENAME, withDrawerFrame } from './RawDataField.mocks';

const meta = {
    component: RawDataField,
    // The embedded variant lives in the mobile-only drawer, so responsive coverage
    // exercises that variant across the phone/tablet widths.
    decorators: [withDrawerFrame, withViewportFromGlobal],
    title: 'Design Slices/program-account/RawDataField@Media',
} satisfies Meta<typeof RawDataField>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { data: MOCK_DATA_LARGE, filename: MOCK_FILENAME, variant: 'embedded' as const };

export const Mobile: Story = {
    args,
    globals: { viewport: { value: 'iphonex' } },
};

export const TabletPortrait: Story = {
    args,
    globals: { viewport: { value: 'ipad' } },
};

export const TabletLandscape: Story = {
    args,
    globals: { viewport: { isRotated: true, value: 'ipad' } },
};

// Fullscreen dialog at phone width — the layout the mode was designed for.
export const MobileFullscreen: Story = {
    args,
    globals: { viewport: { value: 'iphonex' } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /full screen/i }));
    },
};
