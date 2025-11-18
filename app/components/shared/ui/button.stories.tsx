import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight, Check, Download, X } from 'react-feather';
import { expect, within } from 'storybook/test';

import { Button } from './button';

const meta: Meta<typeof Button> = {
    argTypes: {
        asChild: {
            control: 'boolean',
        },
        disabled: {
            control: 'boolean',
        },
        size: {
            control: 'select',
            options: ['default', 'sm', 'lg', 'icon'],
        },
        variant: {
            control: 'select',
            options: ['default', 'accent', 'destructive', 'ghost', 'link', 'outline', 'secondary'],
        },
    },
    component: Button,
    parameters: {
        backgrounds: {
            default: 'Dark',
            values: [{ name: 'Dark', value: '#161a19' }],
        },
        layout: 'centered',
    },
    title: 'Components/Shared/UI/Button',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: 'Button',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Button' });
        expect(button).toBeInTheDocument();
    },
};

export const AllVariants: Story = {
    render: () => (
        <div className="e-flex e-flex-wrap e-gap-4">
            <Button variant="default">Default</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
        </div>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div className="e-flex e-items-center e-gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
                <Check />
            </Button>
        </div>
    ),
};

export const WithIcons: Story = {
    render: () => (
        <div className="e-flex e-flex-wrap e-gap-4">
            <Button>
                <Check />
                Success
            </Button>
            <Button variant="destructive">
                <X />
                Delete
            </Button>
            <Button variant="outline">
                Download
                <Download />
            </Button>
            <Button variant="ghost">
                Continue
                <ArrowRight />
            </Button>
        </div>
    ),
};

export const Disabled: Story = {
    render: () => (
        <div className="e-flex e-flex-wrap e-gap-4">
            <Button disabled>Disabled Default</Button>
            <Button variant="accent" disabled>
                Disabled Accent
            </Button>
            <Button variant="destructive" disabled>
                Disabled Destructive
            </Button>
            <Button variant="outline" disabled>
                Disabled Outline
            </Button>
            <Button variant="secondary" disabled>
                Disabled Secondary
            </Button>
        </div>
    ),
};

export const IconOnly: Story = {
    render: () => (
        <div className="e-flex e-flex-wrap e-gap-4">
            <Button size="icon" variant="default">
                <Check />
            </Button>
            <Button size="icon" variant="accent">
                <Check />
            </Button>
            <Button size="icon" variant="destructive">
                <X />
            </Button>
            <Button size="icon" variant="outline">
                <Download />
            </Button>
            <Button size="icon" variant="ghost">
                <ArrowRight />
            </Button>
        </div>
    ),
};

export const VariantsBySize: Story = {
    render: () => (
        <div className="e-flex e-flex-col e-gap-6">
            <div className="e-flex e-flex-col e-gap-2">
                <h3 className="e-text-sm e-font-semibold">Small</h3>
                <div className="e-flex e-flex-wrap e-gap-4">
                    <Button size="sm" variant="default">
                        Default
                    </Button>
                    <Button size="sm" variant="accent">
                        Accent
                    </Button>
                    <Button size="sm" variant="destructive">
                        Destructive
                    </Button>
                    <Button size="sm" variant="outline">
                        Outline
                    </Button>
                    <Button size="sm" variant="secondary">
                        Secondary
                    </Button>
                    <Button size="sm" variant="ghost">
                        Ghost
                    </Button>
                    <Button size="sm" variant="link">
                        Link
                    </Button>
                </div>
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <h3 className="e-text-sm e-font-semibold">Default</h3>
                <div className="e-flex e-flex-wrap e-gap-4">
                    <Button size="default" variant="default">
                        Default
                    </Button>
                    <Button size="default" variant="accent">
                        Accent
                    </Button>
                    <Button size="default" variant="destructive">
                        Destructive
                    </Button>
                    <Button size="default" variant="outline">
                        Outline
                    </Button>
                    <Button size="default" variant="secondary">
                        Secondary
                    </Button>
                    <Button size="default" variant="ghost">
                        Ghost
                    </Button>
                    <Button size="default" variant="link">
                        Link
                    </Button>
                </div>
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <h3 className="e-text-sm e-font-semibold">Large</h3>
                <div className="e-flex e-flex-wrap e-gap-4">
                    <Button size="lg" variant="default">
                        Default
                    </Button>
                    <Button size="lg" variant="accent">
                        Accent
                    </Button>
                    <Button size="lg" variant="destructive">
                        Destructive
                    </Button>
                    <Button size="lg" variant="outline">
                        Outline
                    </Button>
                    <Button size="lg" variant="secondary">
                        Secondary
                    </Button>
                    <Button size="lg" variant="ghost">
                        Ghost
                    </Button>
                    <Button size="lg" variant="link">
                        Link
                    </Button>
                </div>
            </div>
        </div>
    ),
};

export const Interactive: Story = {
    args: {
        children: 'Click me',
        onClick: () => alert('Button clicked!'),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Click me' });
        expect(button).toBeInTheDocument();
    },
};
