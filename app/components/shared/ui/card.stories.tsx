import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { Card, CardContent, CardTitle } from './card';

const meta: Meta<typeof Card> = {
    component: Card,
    parameters: {
        backgrounds: {
            default: 'Dark',
            values: [{ name: 'Dark', value: '#1D2322' }],
        },
        layout: 'centered',
    },
    title: 'Components/Shared/UI/Card',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const card = canvas.getByText('Card Title').closest('div');
        expect(card).toBeInTheDocument();
    },
    render: args => (
        <Card {...args}>
            <CardTitle>Card Title</CardTitle>
            <CardContent>
                <p>This is a simple card with some content. You can put any content inside it.</p>
            </CardContent>
        </Card>
    ),
};

export const TitleOnly: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const card = canvas.getByText('Card Title').closest('div');
        expect(card).toBeInTheDocument();
    },
    render: args => (
        <Card {...args}>
            <CardTitle>Card Title</CardTitle>
        </Card>
    ),
};

export const Expandable: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const card = canvas.getByText('Card Title').closest('div');
        expect(card).toBeInTheDocument();
    },
    render: args => (
        <Card {...args}>
            <CardTitle>Card Title</CardTitle>
        </Card>
    ),
};
