import type { Meta, StoryObj } from '@storybook/react';

import { IdlPdasView } from '../IdlPdasView';

const meta = {
    component: IdlPdasView,
    parameters: {
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/IDL/Formatted IDL/UI/IdlPdasView',
} satisfies Meta<typeof IdlPdasView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PdasWithSeeds: Story = {
    args: {
        data: [
            {
                docs: ['This PDA has defined seeds.'],
                name: 'SeededPDA',
                seeds: [
                    {
                        docs: ['Seed for the PDA'],
                        kind: 'type',
                        name: 'seed1',
                        type: 'bytes',
                    },
                ],
            },
        ],
    },
};

export const PDAWithMultipleSeeds: Story = {
    args: {
        data: [
            {
                docs: ['PDA with multiple seeds.'],
                name: 'MultiSeedPDA',
                seeds: [
                    {
                        docs: ['First seed'],
                        kind: 'type',
                        name: 'firstSeed',
                        type: 'u8',
                    },
                    {
                        docs: [],
                        kind: 'type',
                        name: 'secondSeed',
                        type: 'publicKey',
                    },
                    {
                        docs: ['Bytes'],
                        kind: 'type',
                        name: 'bytesSeed',
                        type: 'bytes',
                    },
                ],
            },
        ],
    },
};

export const PDAWithUnknownSeedType: Story = {
    args: {
        data: [
            {
                docs: [],
                name: 'UnknownSeedTypePDA',
                seeds: [
                    {
                        docs: [],
                        kind: 'unknown',
                        name: 'mysterySeed',
                        type: '{"custom":"value"}',
                    },
                ],
            },
        ],
    },
};

export const NoPdas: Story = {
    args: {
        data: [],
    },
};
