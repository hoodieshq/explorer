import type { Meta, StoryObj } from '@storybook/react';
import { AlertTriangle, Check, Code, Info, X } from 'react-feather';
import { expect, within } from 'storybook/test';

import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
    argTypes: {
        as: {
            control: 'select',
            options: ['badge', 'link'],
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg'],
        },
        status: {
            control: 'select',
            options: ['active', 'inactive'],
        },
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'success', 'transparent', 'warning', 'info'],
        },
    },
    component: Badge,
    parameters: {
        backgrounds: {
            default: 'Light',
            values: [{ name: 'Light', value: '#ffffff' }],
        },
        layout: 'centered',
    },
    title: 'Components/Shared/UI/Badge',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: 'Badge',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const badge = canvas.getByText('Badge');
        expect(badge).toBeInTheDocument();
    },
};

export const AllVariants: Story = {
    render: () => (
        <div className="e-flex e-flex-wrap e-gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="transparent">Transparent</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="secondary">Secondary</Badge>
        </div>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div className="e-flex e-items-center e-gap-4">
            <Badge size="xs">Extra Small</Badge>
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
        </div>
    ),
};

export const StatusVariants: Story = {
    render: () => (
        <div className="e-flex e-gap-4">
            <Badge status="active">Active</Badge>
            <Badge status="inactive">Inactive</Badge>
        </div>
    ),
};

export const AsLink: Story = {
    render: () => (
        <div className="e-flex e-gap-4">
            <Badge as="link" size="xs" variant="default">
                Link XS
            </Badge>
            <Badge as="link" size="sm" variant="default">
                Link SM
            </Badge>
            <Badge as="link" size="md" variant="default">
                Link MD
            </Badge>
            <Badge as="link" size="lg" variant="default">
                Link LG
            </Badge>
        </div>
    ),
};

export const WithIcon: Story = {
    render: () => (
        <div className="e-flex e-flex-wrap e-gap-4">
            <Badge variant="default">
                <Code size={16} />
                Raw
            </Badge>
            <Badge variant="success">
                <Check size={16} />
                Success
            </Badge>
            <Badge variant="destructive">
                <X size={16} /> Error
            </Badge>
            <Badge variant="warning">
                <AlertTriangle size={16} />
                Warning
            </Badge>
            <Badge variant="info">
                <Info size={16} />
                Info
            </Badge>
        </div>
    ),
};
