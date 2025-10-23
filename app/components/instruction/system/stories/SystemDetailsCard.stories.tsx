import { ClusterProvider } from '@providers/cluster';
import { RawDetailsProvider } from '@providers/transactions/raw';
import { ParsedInstruction, ParsedTransaction, SignatureResult, SystemProgram } from '@solana/web3.js';
import type { Meta, StoryObj } from '@storybook/react';
import type { Decorator } from '@storybook/react';
import { expect, within } from '@storybook/test';
import React from 'react';

import { SystemDetailsCard } from '../SystemDetailsCard';

// Mock providers decorator
const withProviders: Decorator = (Story, context) => {
    return (
        <ClusterProvider>
            <RawDetailsProvider>
                {/*<SignatureContext.Provider value="mock-signature-hash">*/}
                <Story {...context} />
                {/*</SignatureContext.Provider>*/}
            </RawDetailsProvider>
        </ClusterProvider>
    );
};

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
    component: SystemDetailsCard,
    decorators: [withProviders],
    parameters: {
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs'],
    title: 'Components/Instruction/System/SystemDetailsCard',
} satisfies Meta<typeof SystemDetailsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data helper functions
const createMockTransaction = (): ParsedTransaction =>
    ({
        message: {
            accountKeys: [],
            instructions: [],
            recentBlockhash: 'mock-recent-blockhash',
        },
        signatures: ['mock-signature-hash'],
    } as ParsedTransaction);

const createMockResult = (): SignatureResult => ({
    err: null,
});

const createBaseProps = () => ({
    childIndex: undefined,
    index: 0,
    innerCards: undefined,
    result: createMockResult(),
    tx: createMockTransaction(),
});

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const CreateAccount: Story = {
    args: {
        ...createBaseProps(),
        ix: {
            parsed: {
                info: {
                    lamports: 1000000,
                    newAccount: '9QqCYNWoxxEKUF8gWmyobZpJKvUxVS1uM6cCj9gEzpCQ',
                    owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                    source: '7L3NsRjRMzx7Kf12eJo7n7gvwUCQ7QvAFEBHG9JdVHsU',
                    space: 165,
                },
                type: 'createAccount',
            },
            program: 'system',
            programId: SystemProgram.programId,
        } as ParsedInstruction,
    },
    async play({ canvasElement }) {
        const canvas = within(canvasElement);

        // Should render CreateDetailsCard
        expect(canvas.getByText(/Create Account/)).toBeInTheDocument();
        expect(canvas.getByText('1 SOL')).toBeInTheDocument();
        expect(canvas.getByText('165 byte(s)')).toBeInTheDocument();
    },
};
