import type { Connection } from '@solana/web3.js';
import { Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSimulateTransaction } from '../use-simulate-transaction';

vi.mock('@/app/providers/cluster', () => ({
    useCluster: () => ({ cluster: 'devnet' }),
}));

function makeConn(simReturn: any): Connection {
    return {
        simulateTransaction: vi.fn().mockResolvedValue(simReturn),
    } as unknown as Connection;
}

function makeTx(): Transaction {
    const tx = new Transaction();
    tx.feePayer = Keypair.generate().publicKey;
    tx.add(
        new TransactionInstruction({
            data: Buffer.from([]),
            keys: [],
            programId: PublicKey.default,
        }),
    );
    return tx;
}

describe('useSimulateTransaction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should set lastSimulation.status === "success" with logs on happy path', async () => {
        const conn = makeConn({
            context: { slot: 1 },
            value: { err: null, logs: ['l1'], returnData: null, unitsConsumed: 100 },
        });
        const { result } = renderHook(() =>
            useSimulateTransaction({ connection: conn, simulationCommitment: 'processed' }),
        );
        await act(async () => {
            await result.current.simulate(makeTx());
        });
        await waitFor(() => expect(result.current.lastSimulation?.status).toBe('success'));
        expect((result.current.lastSimulation as any).logs).toEqual(['l1']);
    });

    it('should surface simulation logs before throwing on error path', async () => {
        const conn = makeConn({
            context: { slot: 1 },
            value: { err: { InstructionError: [0, { Custom: 6001 }] }, logs: ['log-on-err'] },
        });
        const { result } = renderHook(() =>
            useSimulateTransaction({
                connection: conn,
                idlErrors: [{ code: 6001, name: 'AlreadyInitialized' }] as any,
                simulationCommitment: 'processed',
            }),
        );
        await act(async () => {
            await result.current.simulate(makeTx());
        });
        await waitFor(() => expect(result.current.lastSimulation?.status).toBe('error'));
        expect((result.current.lastSimulation as any).logs).toEqual(['log-on-err']);
        expect((result.current.lastSimulation as any).message).toContain('AlreadyInitialized');
    });

    it('should set error state via reportError without invoking RPC', async () => {
        const conn = makeConn({ context: { slot: 1 }, value: { err: null, logs: [] } });
        const { result } = renderHook(() =>
            useSimulateTransaction({ connection: conn, simulationCommitment: 'processed' }),
        );
        act(() => result.current.reportError(new Error('build failed')));
        await waitFor(() => expect(result.current.lastSimulation?.status).toBe('error'));
        expect(conn.simulateTransaction).not.toHaveBeenCalled();
    });

    it('should clear lastSimulation on reset', async () => {
        const conn = makeConn({ context: { slot: 1 }, value: { err: null, logs: [] } });
        const { result } = renderHook(() =>
            useSimulateTransaction({ connection: conn, simulationCommitment: 'processed' }),
        );
        await act(async () => {
            await result.current.simulate(makeTx());
        });
        act(() => result.current.reset());
        expect(result.current.lastSimulation).toBeNull();
    });

    it('should pass sigVerify=false and replaceRecentBlockhash=true to the RPC', async () => {
        const sim = vi.fn().mockResolvedValue({ context: { slot: 1 }, value: { err: null, logs: [] } });
        const conn = { simulateTransaction: sim } as unknown as Connection;
        const { result } = renderHook(() =>
            useSimulateTransaction({ connection: conn, simulationCommitment: 'processed' }),
        );
        await act(async () => {
            await result.current.simulate(makeTx());
        });
        expect(sim).toHaveBeenCalledTimes(1);
        const opts = sim.mock.calls[0][1];
        expect(opts.sigVerify).toBe(false);
        expect(opts.replaceRecentBlockhash).toBe(true);
    });
});
