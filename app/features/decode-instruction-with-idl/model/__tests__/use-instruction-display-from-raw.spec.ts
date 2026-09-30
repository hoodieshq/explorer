import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInstructionDisplayFromRaw } from '../use-instruction-display-from-raw';

const getInstructionDisplay = vi.fn();
vi.mock('@codama/dynamic-instructions', async importOriginal => ({
    ...(await importOriginal<typeof import('@codama/dynamic-instructions')>()),
    getInstructionDisplay: (...args: unknown[]) => getInstructionDisplay(...args),
}));

const pmpState = { isLoading: false, programMetadataIdl: undefined as unknown };
vi.mock('@entities/program-metadata', () => ({ useProgramMetadataIdl: () => pmpState }));

vi.mock('@entities/cluster', () => {
    const rpc = {};
    return {
        useCluster: () => ({ cluster: 'devnet', url: 'http://localhost' }),
        useSolanaRpc: () => rpc,
    };
});

const fetchEncodedAccount = vi.fn();
vi.mock('@solana/kit', async importOriginal => ({
    ...(await importOriginal<typeof import('@solana/kit')>()),
    fetchEncodedAccount: (...args: unknown[]) => fetchEncodedAccount(...args),
}));

const DISPLAY_IDL = {
    kind: 'rootNode',
    program: { instructions: [{ display: { interpolatedIntent: 'Transfer ${data.amount}' }, name: 'transferSol' }] },
};

const PLAIN_IDL = { kind: 'rootNode', program: { instructions: [{ name: 'transferSol' }] } };

const DISPLAY: InstructionDisplay = {
    fields: [{ label: 'Amount', value: '1.5 SOL' }],
    intent: 'Transfer SOL',
    interpolatedIntent: 'Transfer 1.5 SOL',
};

function createRaw(data = [2, 0, 0, 0]) {
    return new TransactionInstruction({ data: Buffer.from(data), keys: [], programId: PublicKey.unique() });
}

const raw = createRaw();
const programId = raw.programId.toBase58();

type Props = Parameters<typeof useInstructionDisplayFromRaw>[0];

// A fresh cache per test: results are kept for the page's lifetime by design.
function wrapper({ children }: { children: ReactNode }) {
    return createElement(SWRConfig, { value: { dedupingInterval: 0, provider: () => new Map() } }, children);
}

function setup(initialProps: Props) {
    return renderHook((props: Props) => useInstructionDisplayFromRaw(props), { initialProps, wrapper });
}

describe('useInstructionDisplayFromRaw', () => {
    beforeEach(() => {
        getInstructionDisplay.mockReset();
        getInstructionDisplay.mockResolvedValue(DISPLAY);
        fetchEncodedAccount.mockReset();
        pmpState.programMetadataIdl = DISPLAY_IDL;
    });

    it('should report hasDisplay without resolving while disabled', () => {
        const { result } = setup({ enabled: false, programId, raw });

        expect(result.current.hasDisplay).toBe(true);
        expect(result.current.state).toEqual({ status: 'idle' });
        expect(getInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should resolve the display once enabled flips true', async () => {
        const { result, rerender } = setup({ enabled: false, programId, raw });

        rerender({ enabled: true, programId, raw });

        await waitFor(() =>
            expect(result.current.state).toEqual({ display: DISPLAY, status: 'resolved', usedAccountData: false }),
        );
        expect(getInstructionDisplay).toHaveBeenCalledTimes(1);
    });

    it('should pass the IDL and the converted instruction to the resolver', async () => {
        const { result } = setup({ enabled: true, programId, raw });

        await waitFor(() => expect(result.current.state.status).toBe('resolved'));

        const [idlArg, instructionArg, optionsArg] = getInstructionDisplay.mock.calls[0];
        expect(idlArg).toBe(DISPLAY_IDL);
        expect(instructionArg).toMatchObject({ data: raw.data, programAddress: programId });
        expect(typeof (optionsArg as { fetchAccount: unknown }).fetchAccount).toBe('function');
    });

    it('should flag a display that read live account data', async () => {
        getInstructionDisplay.mockImplementation(
            async (_idl: unknown, _ix: unknown, options: { fetchAccount: (address: string) => Promise<unknown> }) => {
                await options.fetchAccount(programId);
                return DISPLAY;
            },
        );
        fetchEncodedAccount.mockResolvedValue({ exists: false });

        const { result } = setup({ enabled: true, programId, raw });

        await waitFor(() =>
            expect(result.current.state).toEqual({ display: DISPLAY, status: 'resolved', usedAccountData: true }),
        );
    });

    it('should report hasDisplay false and not resolve for an IDL without display metadata', () => {
        pmpState.programMetadataIdl = PLAIN_IDL;

        const { result } = setup({ enabled: true, programId, raw });

        expect(result.current.hasDisplay).toBe(false);
        expect(result.current.state).toEqual({ status: 'idle' });
        expect(getInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should stay idle when there is no raw instruction', () => {
        const { result } = setup({ enabled: true, programId, raw: undefined });

        expect(result.current.state).toEqual({ status: 'idle' });
        expect(getInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should resolve to no display when the instruction is not identified', async () => {
        getInstructionDisplay.mockResolvedValue(null);

        const { result } = setup({ enabled: true, programId, raw });

        await waitFor(() =>
            expect(result.current.state).toEqual({ display: undefined, status: 'resolved', usedAccountData: false }),
        );
    });

    it('should report an error with a retry that resolves again', async () => {
        getInstructionDisplay.mockRejectedValueOnce(new Error('rpc down'));

        const { result } = setup({ enabled: true, programId, raw });

        await waitFor(() => expect(result.current.state.status).toBe('error'));

        await act(async () => {
            const { state } = result.current;
            if (state.status === 'error') state.retry();
        });

        await waitFor(() => expect(result.current.state.status).toBe('resolved'));
        expect(getInstructionDisplay).toHaveBeenCalledTimes(2);
    });

    it('should reuse a cached result for the same instruction bytes', async () => {
        const { result, rerender } = setup({ enabled: true, programId, raw });
        await waitFor(() => expect(result.current.state.status).toBe('resolved'));

        const sameBytes = new TransactionInstruction({ data: raw.data, keys: [], programId: raw.programId });
        rerender({ enabled: true, programId, raw: sameBytes });

        expect(result.current.state.status).toBe('resolved');
        expect(getInstructionDisplay).toHaveBeenCalledTimes(1);
    });
});
