import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent,within } from '@storybook/test';

import { InstructionCard } from './InstructionCard';

const meta: Meta<typeof InstructionCard> = {
    argTypes: {
        description: {
            control: 'text',
            description: 'Optional description text below the title',
        },
        isSelected: {
            control: 'boolean',
            description: 'Whether the instruction is currently selected',
        },
        onSelect: {
            action: 'selected',
            description: 'Callback when the radio button is clicked',
        },
        title: {
            control: 'text',
            description: 'The title of the instruction card',
        },
    },
    component: InstructionCard,
    parameters: {
        backgrounds: {
            default: 'Dark',
            values: [{ name: 'Dark', value: '#1D2322' }],
        },
        layout: 'centered',
    },
    title: 'Features/IDL/Interactive IDL/InstructionCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: (
            <div className="e-space-y-3">
                <div className="e-p-3 e-bg-[#1A1A1A] e-rounded-md e-border e-border-[#2A2A2A]">
                    <h4 className="e-text-sm e-font-medium e-text-white e-mb-2">Accounts</h4>
                    <div className="e-text-xs e-text-[#8E9090]">
                        <div>• newAccount: The account to create</div>
                        <div>• mint: The mint this account will be associated with</div>
                    </div>
                </div>
                <div className="e-p-3 e-bg-[#1A1A1A] e-rounded-md e-border e-border-[#2A2A2A]">
                    <h4 className="e-text-sm e-font-medium e-text-white e-mb-2">Arguments</h4>
                    <div className="e-text-xs e-text-[#8E9090]">
                        <div>• amount: The amount of tokens to mint</div>
                    </div>
                </div>
            </div>
        ),
        description: 'Creates a new account with the specified parameters',
        isSelected: false,
        title: 'Create Account',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Check that the card title is rendered
        const title = canvas.getByText('Create Account');
        expect(title).toBeInTheDocument();

        // Check that the description is rendered
        const description = canvas.getByText('Creates a new account with the specified parameters');
        expect(description).toBeInTheDocument();

        // Check that the expandable content is initially hidden
        const accountsSection = canvas.queryByText('Accounts');
        expect(accountsSection).not.toBeInTheDocument();
    },
};
