import { ParsedInstruction, ParsedTransaction, SystemProgram } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { SystemDetailsCard } from '../SystemDetailsCard';

// Mock the useCluster hook to avoid provider requirement
vi.mock('@providers/cluster', () => ({
    useCluster: vi.fn(() => ({
        cluster: 'mainnet-beta',
        name: 'mainnet-beta',
        url: 'https://api.mainnet-beta.solana.com',
    })),
}));

// Mock tx utils
vi.mock('@utils/tx', async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        getProgramName: vi.fn((_programId: string, _cluster: string) => 'System Program'),
    };
});

// Mock raw transaction provider hooks
vi.mock('@providers/transactions/raw', () => ({
    useFetchRawTransaction: vi.fn(() => vi.fn()),
    useRawTransactionDetails: vi.fn(() => undefined),
}));

// Mock all the child detail cards
vi.mock('../CreateDetailsCard', () => ({
    CreateDetailsCard: ({ info }: { info: any }) => (
        <div data-testid="create-details-card">
            <span>Create Account</span>
            <span>{info.lamports / 1000000} SOL</span>
            <span>{info.space} byte(s)</span>
        </div>
    ),
}));

// Mock console.error to check error logging
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('SystemDetailsCard', () => {
    const defaultProps = {
        childIndex: undefined,
        index: 0,
        innerCards: undefined,
        result: { err: null },
        tx: {
            message: {
                accountKeys: [],
                instructions: [],
                recentBlockhash: 'mock-recent-blockhash',
            },
            signatures: ['mock-signature-hash'],
        } as ParsedTransaction,
    };

    beforeEach(() => {
        consoleErrorSpy.mockClear();
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });

    it('should render CreateDetailsCard for createAccount instruction', () => {
        const ix = {
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
        } as ParsedInstruction;

        render(<SystemDetailsCard {...defaultProps} ix={ix} />);

        expect(screen.getByTestId('create-details-card')).toBeInTheDocument();
        expect(screen.getByText('Create Account')).toBeInTheDocument();
        expect(screen.getByText('1 SOL')).toBeInTheDocument();
        expect(screen.getByText('165 byte(s)')).toBeInTheDocument();
    });
});
