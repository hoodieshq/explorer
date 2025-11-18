import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { Input } from './input';

const meta: Meta<typeof Input> = {
    argTypes: {
        disabled: {
            control: 'boolean',
        },
        placeholder: {
            control: 'text',
        },
        type: {
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
        },
        variant: {
            control: 'select',
            options: ['default', 'dark'],
        },
    },
    component: Input,
    parameters: {
        backgrounds: {
            default: 'Dark',
            values: [{ name: 'Dark', value: '#1D2322' }],
        },
        layout: 'centered',
    },
    title: 'Components/Shared/UI/Input',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        placeholder: 'Enter text...',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByPlaceholderText('Enter text...');
        expect(input).toBeInTheDocument();
    },
};

export const AllVariants: Story = {
    render: () => (
        <div className="e-flex e-w-full e-max-w-md e-flex-col e-gap-4">
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="default-variant" className="e-text-sm e-font-semibold e-text-white">
                    Default Variant
                </label>
                <Input id="default-variant" variant="default" placeholder="Default input variant" />
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="dark-variant" className="e-text-sm e-font-semibold e-text-white">
                    Dark Variant
                </label>
                <Input id="dark-variant" variant="dark" placeholder="Dark input variant" />
            </div>
        </div>
    ),
};

export const WithValue: Story = {
    render: () => (
        <div className="e-flex e-w-full e-max-w-md e-flex-col e-gap-4">
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="default-with-value" className="e-text-sm e-font-semibold e-text-white">
                    Default with value
                </label>
                <Input id="default-with-value" variant="default" defaultValue="Sample text value" />
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="dark-with-value" className="e-text-sm e-font-semibold e-text-white">
                    Dark with value
                </label>
                <Input id="dark-with-value" variant="dark" defaultValue="Sample text value" />
            </div>
        </div>
    ),
};

export const Disabled: Story = {
    render: () => (
        <div className="e-flex e-w-full e-max-w-md e-flex-col e-gap-4">
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="disabled-default" className="e-text-sm e-font-semibold e-text-white">
                    Disabled Default
                </label>
                <Input id="disabled-default" variant="default" placeholder="Disabled input" disabled />
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="disabled-dark" className="e-text-sm e-font-semibold e-text-white">
                    Disabled Dark
                </label>
                <Input id="disabled-dark" variant="dark" placeholder="Disabled input" disabled />
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="disabled-with-value" className="e-text-sm e-font-semibold e-text-white">
                    Disabled with value
                </label>
                <Input id="disabled-with-value" variant="default" defaultValue="Cannot edit this" disabled />
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="disabled-dark-with-value" className="e-text-sm e-font-semibold e-text-white">
                    Disabled Dark with value
                </label>
                <Input id="disabled-dark-with-value" variant="dark" defaultValue="Cannot edit this" disabled />
            </div>
        </div>
    ),
};

export const ErrorState: Story = {
    render: () => (
        <div className="e-flex e-w-full e-max-w-md e-flex-col e-gap-4">
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="error-default" className="e-text-sm e-font-semibold e-text-white">
                    Error State (Default)
                </label>
                <Input id="error-default" variant="default" placeholder="Invalid input" aria-invalid="true" />
                <p className="e-text-xs e-text-destructive">This field has an error</p>
            </div>
            <div className="e-flex e-flex-col e-gap-2">
                <label htmlFor="error-dark" className="e-text-sm e-font-semibold e-text-white">
                    Error State (Dark)
                </label>
                <Input id="error-dark" variant="dark" placeholder="Invalid input" aria-invalid="true" />
                <p className="e-text-xs e-text-destructive">This field has an error</p>
            </div>
        </div>
    ),
};
