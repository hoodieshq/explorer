import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { act, renderHook, waitFor } from '@testing-library/react';
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

const STALE_DISPLAY: InstructionDisplay = {
    fields: [{ label: 'Amount', value: '0.1 SOL' }],
    intent: 'Transfer SOL',
    interpolatedIntent: 'Transfer 0.1 SOL',
};

function createRaw() {
    return new TransactionInstruction({ data: Buffer.from([2, 0, 0, 0]), keys: [], programId: PublicKey.unique() });
}

const raw = createRaw();
const programId = raw.programId.toBase58();

type Props = Parameters<typeof useInstructionDisplayFromRaw>[0];

function setup(initialProps: Props) {
    return renderHook((props: Props) => useInstructionDisplayFromRaw(props), { initialProps });
}

describe('useInstructionDisplayFromRaw', () => {
    beforeEach(() => {
        getInstructionDisplay.mockReset();
        getInstructionDisplay.mockResolvedValue(DISPLAY);
        pmpState.programMetadataIdl = DISPLAY_IDL;
    });

    it('should report hasDisplay without resolving while disabled', () => {
        const { result } = setup({ enabled: false, programId, raw });

        expect(result.current.hasDisplay).toBe(true);
        expect(result.current.display).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
        expect(getInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should resolve the display once enabled flips true', async () => {
        const { result, rerender } = setup({ enabled: false, programId, raw });

        rerender({ enabled: true, programId, raw });

        await waitFor(() => expect(result.current.display).toEqual(DISPLAY));
        expect(result.current.isLoading).toBe(false);
        expect(getInstructionDisplay).toHaveBeenCalledTimes(1);
    });

    it('should pass the IDL, the converted instruction and a fetchAccount to the resolver', async () => {
        const { result } = setup({ enabled: true, programId, raw });

        await waitFor(() => expect(result.current.display).toEqual(DISPLAY));

        const [idlArg, instructionArg, optionsArg] = getInstructionDisplay.mock.calls[0];
        expect(idlArg).toBe(DISPLAY_IDL);
        expect(instructionArg).toMatchObject({ data: raw.data, programAddress: programId });
        expect(typeof (optionsArg as { fetchAccount: unknown }).fetchAccount).toBe('function');
    });

    it('should report hasDisplay false and not resolve for an IDL without display metadata', () => {
        pmpState.programMetadataIdl = PLAIN_IDL;

        const { result } = setup({ enabled: true, programId, raw });

        expect(result.current.hasDisplay).toBe(false);
        expect(result.current.display).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
        expect(getInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should not resolve when there is no raw instruction', () => {
        const { result } = setup({ enabled: true, programId, raw: undefined });

        expect(result.current.hasDisplay).toBe(true);
        expect(result.current.display).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
        expect(getInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should leave the display undefined when the instruction is not identified', async () => {
        getInstructionDisplay.mockResolvedValue(null);

        const { result } = setup({ enabled: true, programId, raw });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.display).toBeUndefined();
    });

    it('should leave the display undefined when resolution rejects', async () => {
        getInstructionDisplay.mockRejectedValue(new Error('unsupported instruction'));

        const { result } = setup({ enabled: true, programId, raw });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.display).toBeUndefined();
    });

    it('should discard an in-flight result once a newer instruction supersedes it', async () => {
        let resolveFirst: (display: InstructionDisplay) => void = () => {};
        getInstructionDisplay
            .mockImplementationOnce(() => new Promise<InstructionDisplay>(resolve => (resolveFirst = resolve)))
            .mockResolvedValueOnce(DISPLAY);

        const { result, rerender } = setup({ enabled: true, programId, raw });
        await waitFor(() => expect(getInstructionDisplay).toHaveBeenCalledTimes(1));

        rerender({ enabled: true, programId, raw: createRaw() });
        await waitFor(() => expect(result.current.display).toEqual(DISPLAY));

        await act(async () => {
            resolveFirst(STALE_DISPLAY);
        });

        expect(result.current.display).toEqual(DISPLAY);
    });
});
