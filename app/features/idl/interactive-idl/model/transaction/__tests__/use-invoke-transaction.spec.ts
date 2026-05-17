import { useWallet } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';
import { Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInvokeTransaction } from '../use-invoke-transaction';

vi.mock('@solana/wallet-adapter-react');
vi.mock('@/app/providers/cluster', () => ({
    useCluster: () => ({ cluster: 'devnet' }),
}));

const PK = Keypair.generate().publicKey;

function makeConnection(overrides: Partial<Connection> = {}): Connection {
    return {
        confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
        getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: 'abc', lastValidBlockHeight: 100 }),
        getTransaction: vi.fn().mockResolvedValue({ meta: { logMessages: ['final-log'] } }),
        sendRawTransaction: vi.fn().mockResolvedValue('sig123'),
        simulateTransaction: vi.fn().mockResolvedValue({ context: { slot: 1 }, value: { err: null, logs: ['s'] } }),
        ...overrides,
    } as unknown as Connection;
}

function makeTx(): Transaction {
    const tx = new Transaction();
    tx.feePayer = PK;
    tx.add(
        new TransactionInstruction({
            data: Buffer.from([]),
            keys: [],
            programId: PublicKey.default,
        }),
    );
    return tx;
}

function mockWallet(connected = true) {
    vi.mocked(useWallet).mockReturnValue({
        connected,
        publicKey: connected ? PK : null,
        signAllTransactions: vi.fn(),
        signTransaction: vi.fn(async (tx: any) => ({ ...tx, serialize: () => new Uint8Array() })),
    } as any);
}

describe('useInvokeTransaction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWallet(true);
    });

    it('should sign, send, confirm, and set lastResult.success with final logs on happy path', async () => {
        const conn = makeConnection();
        const onSuccess = vi.fn();
        const { result } = renderHook(() =>
            useInvokeTransaction({
                commitment: 'confirmed',
                connection: conn,
                onSuccess,
                simulationCommitment: 'processed',
            }),
        );
        await act(async () => {
            await result.current.invoke(makeTx());
        });
        await waitFor(() => expect(result.current.lastResult?.status).toBe('success'));
        expect((result.current.lastResult as any).signature).toBe('sig123');
        expect((result.current.lastResult as any).logs).toEqual(['final-log']);
        expect(onSuccess).toHaveBeenCalledWith('sig123');
    });

    it('should surface simulation logs before throwing on simulation error', async () => {
        const conn = makeConnection({
            simulateTransaction: vi.fn().mockResolvedValue({
                context: { slot: 1 },
                value: { err: { InstructionError: [0, { Custom: 6001 }] }, logs: ['err-log'] },
            }) as any,
        });
        const { result } = renderHook(() =>
            useInvokeTransaction({
                commitment: 'confirmed',
                connection: conn,
                idlErrors: [{ code: 6001, name: 'AlreadyInitialized' }] as any,
                simulationCommitment: 'processed',
            }),
        );
        await act(async () => {
            await result.current.invoke(makeTx());
        });
        await waitFor(() => expect(result.current.lastResult?.status).toBe('error'));
        expect((result.current.lastResult as any).logs).toEqual(['err-log']);
        expect((result.current.lastResult as any).message).toContain('AlreadyInitialized');
    });

    it('should fire onPreInvocationError when wallet is disconnected and not call signTransaction', async () => {
        mockWallet(false);
        const conn = makeConnection();
        const onPreInvocationError = vi.fn();
        const { result } = renderHook(() =>
            useInvokeTransaction({
                commitment: 'confirmed',
                connection: conn,
                onPreInvocationError,
                simulationCommitment: 'processed',
            }),
        );
        await act(async () => {
            await result.current.invoke(makeTx());
        });
        expect(onPreInvocationError).toHaveBeenCalledWith('Wallet not connected');
        expect(conn.sendRawTransaction).not.toHaveBeenCalled();
    });

    it('should set lastResult.error on confirmation error', async () => {
        const conn = makeConnection({
            confirmTransaction: vi.fn().mockResolvedValue({ value: { err: 'oops' } }) as any,
        });
        const { result } = renderHook(() =>
            useInvokeTransaction({
                commitment: 'confirmed',
                connection: conn,
                simulationCommitment: 'processed',
            }),
        );
        await act(async () => {
            await result.current.invoke(makeTx());
        });
        await waitFor(() => expect(result.current.lastResult?.status).toBe('error'));
    });

    it('should surface caller-side build errors via reportError without calling RPC', async () => {
        const conn = makeConnection();
        const { result } = renderHook(() =>
            useInvokeTransaction({
                commitment: 'confirmed',
                connection: conn,
                simulationCommitment: 'processed',
            }),
        );
        act(() => result.current.reportError(new Error('boom')));
        await waitFor(() => expect(result.current.lastResult?.status).toBe('error'));
        expect((result.current.lastResult as any).message).toBe('boom');
        expect(result.current.isExecuting).toBe(false);
        expect(conn.sendRawTransaction).not.toHaveBeenCalled();
    });
});
