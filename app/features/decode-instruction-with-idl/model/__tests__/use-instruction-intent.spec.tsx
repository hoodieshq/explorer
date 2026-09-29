import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntentExpansionProvider, useIntentExpansion } from '../intent-expansion';
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

function setup(initialProps: Props, withProvider = false) {
    const wrapper = withProvider
        ? ({ children }: { children: ReactNode }) => <IntentExpansionProvider>{children}</IntentExpansionProvider>
        : undefined;

    return renderHook((props: Props) => ({ expansion: useIntentExpansion(), intent: useInstructionIntent(props) }), {
        initialProps,
        wrapper,
    });
}

beforeEach(() => {
    displayHook.calls = [];
    displayHook.hasDisplay = true;
    displayHook.state = { status: 'idle' };
});

describe('useInstructionIntent', () => {
    it('should be unavailable for a program without published intents', () => {
        displayHook.hasDisplay = false;

        const { result } = setup({ programId, raw });

        expect(result.current.intent.available).toBe(false);
    });

    it('should be unavailable for an ineligible instruction', () => {
        const { result } = setup({ eligible: false, programId, raw });

        expect(result.current.intent.available).toBe(false);
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

    it('should settle on no summary when the bytes are missing and cannot be requested', () => {
        const { result } = setup({ programId, raw: undefined });

        act(() => result.current.intent.toggle());

        expect(result.current.intent.state).toEqual({
            display: undefined,
            status: 'resolved',
            usedAccountData: false,
        });
    });

    it('should follow a section-level show all and hide all', () => {
        const { result } = setup({ programId, raw }, true);

        expect(result.current.expansion?.supportedCount).toBe(1);

        act(() => result.current.expansion?.setAll(true));
        expect(result.current.intent.open).toBe(true);

        act(() => result.current.expansion?.setAll(false));
        expect(result.current.intent.open).toBe(false);
    });

    it('should not register with the section while unavailable', () => {
        displayHook.hasDisplay = false;

        const { result } = setup({ programId, raw }, true);

        expect(result.current.expansion?.supportedCount).toBe(0);
    });
});
