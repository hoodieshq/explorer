import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { TruncatedAddress } from './truncated-address';

const SAMPLE_ADDRESS = 'S6qY45yeSJrbGB4v6ioSCj3RfLZ8JVEPdU876vWWvCq';

const meta: Meta<typeof TruncatedAddress> = {
    args: {
        address: SAMPLE_ADDRESS,
    },
    component: TruncatedAddress,
    title: 'Components/Shared/UI/TruncatedAddress',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByText('S6qY...WvCq');
        expect(trigger).toBeInTheDocument();

        await userEvent.hover(trigger);

        const body = canvasElement.ownerDocument.body;
        const screen = within(body);
        const tooltips = await screen.findAllByText(SAMPLE_ADDRESS);
        expect(tooltips.length).toBeGreaterThan(0);
    },
};

export const WithDomain: Story = {
    args: {
        display: 'alice.sol',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('alice.sol')).toBeInTheDocument();
    },
};

export const WithLink: Story = {
    args: {
        href: 'https://explorer.solana.com/address/S6qY45yeSJrbGB4v6ioSCj3RfLZ8JVEPdU876vWWvCq',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const link = canvas.getByRole('link');
        expect(link).toHaveAttribute('href');
        expect(link).toHaveAttribute('target', '_blank');
    },
};

export const ShortAddress: Story = {
    args: {
        address: 'ABC123',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('ABC123')).toBeInTheDocument();
    },
};
