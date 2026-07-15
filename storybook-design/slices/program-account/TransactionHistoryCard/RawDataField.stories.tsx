import type { Meta, StoryObj } from '@storybook-config/types';

import { RawDataField } from './RawDataField';
import {
    MOCK_DATA_LARGE,
    MOCK_DATA_SMALL,
    MOCK_DATA_TOO_LARGE,
    MOCK_FILENAME,
    withDrawerFrame,
} from './RawDataField.mocks';

const meta = {
    component: RawDataField,
    parameters: { layout: 'padded' },
    title: 'Design Slices/program-account/RawDataField',
} satisfies Meta<typeof RawDataField>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---- Popover variant (self-contained card with Hex/Base64 tabs) -----------

export const Popover: Story = {
    args: { data: MOCK_DATA_SMALL, filename: MOCK_FILENAME, variant: 'popover' },
};

export const PopoverLoading: Story = {
    args: { data: undefined, filename: MOCK_FILENAME, loading: true, variant: 'popover' },
};

export const PopoverEmpty: Story = {
    args: { data: new Uint8Array(0), filename: MOCK_FILENAME, variant: 'popover' },
};

export const PopoverTooLarge: Story = {
    args: { data: MOCK_DATA_TOO_LARGE, filename: MOCK_FILENAME, variant: 'popover' },
};

// ---- Embedded variant (the "Size (bytes)" drawer row) ---------------------

export const Embedded: Story = {
    args: { data: MOCK_DATA_LARGE, filename: MOCK_FILENAME, variant: 'embedded' },
    decorators: [withDrawerFrame],
};

export const EmbeddedLoading: Story = {
    args: { data: undefined, filename: MOCK_FILENAME, loading: true, variant: 'embedded' },
    decorators: [withDrawerFrame],
};

export const EmbeddedEmpty: Story = {
    args: { data: new Uint8Array(0), filename: MOCK_FILENAME, variant: 'embedded' },
    decorators: [withDrawerFrame],
};
