import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InstructionDisplayState } from '../use-instruction-display-from-raw';
import { useInstructionIntent } from '../use-instruction-intent';

const displayHook = vi.hoisted(() => ({
    calls: [] as { enabled: boolean }[],
    hasDisplay: true,
    state: { status: 'idle' } as InstructionDisplayState,
}));

vi.mock('../use-instruction-display-from-raw', () => ({
    useInstructionDisplayFromRaw: (params: { enabled: boolean }) => {
        displayHook.calls.push(params);
        return { hasDisplay: displayHook.hasDisplay, isIdlLoading: false, state: displayHook.state };
    },
}));

const raw = new TransactionInstruction({ data: Buffer.from([2]), keys: [], programId: PublicKey.unique() });
const programId = raw.programId.toBase58();

type Props = Parameters<typeof useInstructionIntent>[0];

function setup(initialProps: Props) {
    return renderHook((props: Props) => ({ intent: useInstructionIntent(props) }), { initialProps });
}

beforeEach(() => {
    displayHook.calls = [];
    displayHook.hasDisplay = true;
    displayHook.state = { status: 'idle' };
});

describe('useInstructionIntent', () => {
    it('should report a program without published intents as unavailable before any open', () => {
        displayHook.hasDisplay = false;

        const { result } = setup({ programId, raw });

        expect(result.current.intent.state).toEqual({ reason: 'no-metadata', status: 'unavailable' });
    });

    it('should report missing bytes that no request can supply as unavailable', () => {
        const { result } = setup({ programId, raw: undefined });

        expect(result.current.intent.state).toEqual({ reason: 'no-bytes', status: 'unavailable' });
    });

    it('should not compute anything before the first open', () => {
        setup({ programId, raw });

        expect(displayHook.calls.every(call => !call.enabled)).toBe(true);
    });

    it('should start computing on open and keep the request latched after closing', () => {
        const { result } = setup({ programId, raw });

        act(() => result.current.intent.toggle());
        expect(result.current.intent.open).toBe(true);
        expect(displayHook.calls.at(-1)?.enabled).toBe(true);

        act(() => result.current.intent.toggle());
        expect(result.current.intent.open).toBe(false);
        expect(displayHook.calls.at(-1)?.enabled).toBe(true);
    });

    it('should request the raw transaction on first open when the bytes are missing', () => {
        const onRequestRaw = vi.fn();
        const { result } = setup({ onRequestRaw, programId, raw: undefined });

        act(() => result.current.intent.toggle());

        expect(onRequestRaw).toHaveBeenCalledTimes(1);
        expect(result.current.intent.state).toEqual({ status: 'loading' });
    });
});
