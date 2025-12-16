import type { Meta, StoryObj } from '@storybook/react';

import { CUProfilingCard } from '../ui/CUProfilingCard';

const meta: Meta<typeof CUProfilingCard> = {
    component: CUProfilingCard,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    title: 'Components/Transaction/CUProfilingCard',
};

export default meta;
type Story = StoryObj<typeof CUProfilingCard>;

export const TwoInstructions: Story = {
    args: {
        instructions: [
            {
                computeUnits: 45000,
                instructionTitle: 'System Program: Transfer',
                minValue: 150,
                programId: '11111111111111111111111111111111',
            },
            {
                computeUnits: 45000,
                instructionTitle: 'Token Program: Transfer',
                minValue: 150,
                programId: '22222222222222222222222222222222',
            },
        ],
        unitsConsumed: 90000,
        unitsRequested: 100000,
    },
};

// Maximum color variations (10 instructions)
export const TenInstructions: Story = {
    args: {
        instructions: [
            {
                computeUnits: 100000,
                instructionTitle: 'System Program: Create Account',
                minValue: 150,
                programId: 'Program1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 85000,
                instructionTitle: 'Token Program: Initialize Account',
                minValue: 150,
                programId: 'Program2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 70000,
                instructionTitle: 'Token Program: Transfer',
                minValue: 150,
                programId: 'Program3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 55000,
                instructionTitle: 'System Program: Allocate',
                minValue: 150,
                programId: 'Program4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 40000,
                instructionTitle: 'Token Program: Mint To',
                minValue: 150,
                programId: 'Program5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 30000,
                instructionTitle: 'System Program: Assign',
                minValue: 150,
                programId: 'Program6xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 20000,
                instructionTitle: 'Token Program: Approve',
                minValue: 150,
                programId: 'Program7xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 15000,
                instructionTitle: 'System Program: Transfer',
                minValue: 150,
                programId: 'Program8xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 10000,
                instructionTitle: 'Token Program: Revoke',
                minValue: 150,
                programId: 'Program9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                computeUnits: 5000,
                instructionTitle: 'Compute Budget Program: Set Compute Unit Limit',
                minValue: 150,
                programId: 'Program10xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
        ],
        unitsConsumed: 430000,
        unitsRequested: 500000,
    },
};

export const WithZeroComputeUnits: Story = {
    args: {
        instructions: [
            {
                computeUnits: 50000,
                instructionTitle: 'System Program: Transfer',
                minValue: 150,
                programId: '11111111111111111111111111111111',
            },
            {
                computeUnits: 0,
                displayUnits: 1200,
                instructionTitle: 'Address Lookup Table Program',
                minValue: 150,
                programId: 'AddressLookupTab1e1111111111111111111111111',
                reservedValue: 1200,
            },
            {
                computeUnits: 30000,
                instructionTitle: 'Token Program: Approve',
                minValue: 150,
                programId: '33333333333333333333333333333333',
            },
        ],
        unitsConsumed: 51200,
        unitsRequested: 60000,
    },
};

// Empty case (should render nothing)
export const EmptyInstructions: Story = {
    args: {
        instructions: [],
    },
};
