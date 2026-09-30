import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { isIntentMissing, toIntentState } from '../intent-state';

const raw = new TransactionInstruction({ data: Buffer.from([2]), keys: [], programId: PublicKey.unique() });
const DISPLAY: InstructionDisplay = { fields: [], intent: 'Transfer SOL', interpolatedIntent: 'Transfer 1 SOL' };

const BASE = {
    canRequestRaw: false,
    display: { status: 'idle' as const },
    hasDisplay: true,
    isIdlLoading: false,
    raw,
    requested: true,
};

describe('toIntentState', () => {
    it('should wait while the IDL is still loading', () => {
        expect(toIntentState({ ...BASE, hasDisplay: false, isIdlLoading: true })).toEqual({ status: 'loading' });
    });

    it('should report a program without intent metadata before anything is requested', () => {
        expect(toIntentState({ ...BASE, hasDisplay: false, requested: false })).toEqual({
            reason: 'no-metadata',
            status: 'unavailable',
        });
    });

    it('should report missing bytes that no fetch can supply', () => {
        expect(toIntentState({ ...BASE, raw: undefined })).toEqual({ reason: 'no-bytes', status: 'unavailable' });
    });

    it('should wait for bytes a raw-transaction fetch can still supply', () => {
        expect(toIntentState({ ...BASE, canRequestRaw: true, raw: undefined })).toEqual({ status: 'loading' });
    });

    it('should stay idle for a supported instruction until it is requested', () => {
        expect(toIntentState({ ...BASE, requested: false })).toEqual({ status: 'idle' });
    });

    it('should turn an unidentified instruction into an unavailable intent', () => {
        const display = { display: undefined, status: 'resolved' as const, usedAccountData: false };

        expect(toIntentState({ ...BASE, display })).toEqual({ reason: 'not-identified', status: 'unavailable' });
    });

    it('should pass a resolved display through', () => {
        const display = { display: DISPLAY, status: 'resolved' as const, usedAccountData: true };

        expect(toIntentState({ ...BASE, display })).toEqual(display);
    });
});

describe('isIntentMissing', () => {
    it('should count unavailable and failed intents as missing', () => {
        expect(isIntentMissing({ reason: 'no-metadata', status: 'unavailable' })).toBe(true);
        expect(isIntentMissing({ retry: () => {}, status: 'error' })).toBe(true);
        expect(isIntentMissing({ status: 'loading' })).toBe(false);
    });
});
