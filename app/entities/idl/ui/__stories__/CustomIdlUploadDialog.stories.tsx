import type { Meta, StoryObj } from '@storybook-config/types';
import { fn } from 'storybook/test';

import { type CustomIdlWriteResult } from '../../model/custom-idl/custom-idl-store';
import { CustomIdlUploadDialog } from '../CustomIdlUploadDialog';

const meta = {
    args: {
        onOpenChange: fn(),
        onSubmit: fn((): CustomIdlWriteResult => ({ ok: true })),
        open: true,
    },
    component: CustomIdlUploadDialog,
    tags: ['autodocs'],
    title: 'Entities/IDL/CustomIdlUploadDialog',
} satisfies Meta<typeof CustomIdlUploadDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleProgram: Story = {};

export const RejectedIdl: Story = {
    args: {
        onSubmit: fn((): CustomIdlWriteResult => ({
            error: 'This IDL is for program ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S, not AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye.',
            ok: false,
        })),
    },
};
