import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, within } from 'storybook/test';

import { BaseIdlSourceSelect } from '../BaseIdlSourceSelect';

const meta = {
    args: { hasCustomIdl: false, onAdd: fn(), onRemove: fn(), onSelect: fn() },
    component: BaseIdlSourceSelect,
    tags: ['autodocs', 'test'],
    title: 'Entities/IDL/BaseIdlSourceSelect',
} satisfies Meta<typeof BaseIdlSourceSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoIdl: Story = {
    args: { options: [], value: undefined },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: 'IDL: None' })).toBeInTheDocument();
    },
};

export const OnChainOnly: Story = {
    args: { options: ['programMetadata'], value: 'programMetadata' },
};

export const BothOnChainSources: Story = {
    args: { options: ['programMetadata', 'anchor'], value: 'programMetadata' },
};

export const CustomSelected: Story = {
    args: {
        customIdlFileName: 'voting.json',
        hasCustomIdl: true,
        options: ['programMetadata', 'anchor'],
        value: 'custom',
    },
};

export const CustomStoredOnChainSelected: Story = {
    args: { customIdlFileName: 'voting.json', hasCustomIdl: true, options: ['anchor'], value: 'anchor' },
};

export const CustomFromPastedJson: Story = {
    args: { hasCustomIdl: true, options: [], value: 'custom' },
};
