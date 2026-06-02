import type { Meta, StoryObj } from '@storybook/react';

import { WarningNote } from '../WarningNote';

const meta: Meta<typeof WarningNote> = {
    component: WarningNote,
    decorators: [
        Story => (
            <div className="e-w-[500px]">
                <Story />
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
    },
    title: 'Features/IDL/Interactive IDL/UI/WarningNote',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        label: 'You are connected to Mainnet, which uses real funds',
    },
};

export const LongText: Story = {
    args: {
        label: 'You are connected to Mainnet, which uses real funds. Double-check every account and argument before executing this instruction, as the action cannot be undone.',
    },
};

export const CustomClassName: Story = {
    args: {
        className: 'e-mt-0 e-justify-center e-rounded-lg e-bg-destructive/10 e-p-2',
        label: 'You are connected to Mainnet, which uses real funds',
    },
};
