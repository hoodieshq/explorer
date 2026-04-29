import { AccountStatus } from '@entities/account-history';
import { address } from '@solana/kit';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { deflate } from 'pako';
import { describe, expect, it } from 'vitest';

import { createAnchorIdlHistoryBuilder } from '../history-builder';
import type { AnchorIdlEvent, AnchorIdlState } from '../types';
import { InstructionType } from '../types';

const PROGRAM = address('AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye');
const builder = createAnchorIdlHistoryBuilder(PROGRAM);

const BASE_EVENT: AnchorIdlEvent = {
    blockTime: 1700000000,
    failed: false,
    instructionType: InstructionType.Create,
    signature: 'sig',
    slot: 100,
};

describe('Anchor IDL applyEvent', () => {
    describe('Create', () => {
        it('should wipe state and mark Active (Create is genesis for Anchor IDL)', () => {
            const next = builder.applyEvent(activeState({ mutable: false, status: AccountStatus.Closed }), {
                ...BASE_EVENT,
                instructionType: InstructionType.Create,
            });
            expect(next.status).toBe(AccountStatus.Active);
            expect(next.authority).toBeUndefined();
            expect(next.content).toBeUndefined();
            expect(next.dataSize).toBe(0);
            expect(next.mutable).toBe(true);
        });
    });

    describe('Write', () => {
        it('should be a no-op when rawData is empty (Anchor Writes always carry data)', () => {
            const seeded = activeState();
            const next = builder.applyEvent(seeded, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: new Uint8Array(0),
            });
            expect(next).toBe(seeded);
        });

        it('should append bytes and decode zlib-compressed JSON content', () => {
            const compressed = deflate(new TextEncoder().encode('{"name":"x"}'));
            const next = builder.applyEvent(builder.initialState, {
                ...BASE_EVENT,
                dataLength: compressed.length,
                instructionType: InstructionType.Write,
                rawData: compressed,
            });
            expect(next.status).toBe(AccountStatus.Active);
            expect(next.dataSize).toBe(compressed.length);
            expect(next.content).toContain('"name"');
        });

        it('should accept partial chunks: status flips Active but content stays undefined until decode succeeds', () => {
            const partial = new Uint8Array([0xde, 0xad, 0xbe, 0xef]); // not valid zlib
            const next = builder.applyEvent(builder.initialState, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: partial,
            });
            expect(next.status).toBe(AccountStatus.Active);
            expect(next.dataSize).toBe(4);
            expect(next.content).toBeUndefined();
        });

        it('should accumulate across multiple Writes', () => {
            const compressed = deflate(new TextEncoder().encode('{"name":"x"}'));
            const half = Math.floor(compressed.length / 2);
            const a = builder.applyEvent(builder.initialState, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: compressed.subarray(0, half),
            });
            const b = builder.applyEvent(a, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: compressed.subarray(half),
            });
            expect(b.dataSize).toBe(compressed.length);
            expect(b.content).toContain('"name"');
        });
    });

    describe('SetAuthority', () => {
        it('should treat SYSTEM_PROGRAM_ADDRESS as the immutability marker', () => {
            const next = builder.applyEvent(activeState(), {
                ...BASE_EVENT,
                instructionType: InstructionType.SetAuthority,
                newAuthority: SYSTEM_PROGRAM_ADDRESS,
            });
            expect(next.authority).toBe(SYSTEM_PROGRAM_ADDRESS);
            expect(next.mutable).toBe(false);
        });

        it('should treat any other authority as a real handover (mutable stays true)', () => {
            const next = builder.applyEvent(activeState(), {
                ...BASE_EVENT,
                instructionType: InstructionType.SetAuthority,
                newAuthority: 'new-authority',
            });
            expect(next.authority).toBe('new-authority');
            expect(next.mutable).toBe(true);
        });
    });

    describe('Close', () => {
        it('should reset state to closed empty', () => {
            const next = builder.applyEvent(activeState(), { ...BASE_EVENT, instructionType: InstructionType.Close });
            expect(next.status).toBe(AccountStatus.Closed);
            expect(next.dataSize).toBe(0);
            expect(next.content).toBeUndefined();
            expect(next.authority).toBeUndefined();
        });
    });

    describe('SetBuffer', () => {
        it('should clear content when no resolved buffer bytes are provided', () => {
            const seeded = activeState({ content: 'x' });
            const next = builder.applyEvent(seeded, { ...BASE_EVENT, instructionType: InstructionType.SetBuffer });
            expect(next.bufferData.length).toBe(0);
            expect(next.content).toBeUndefined();
            // The status stays whatever it was — SetBuffer doesn't itself change activeness.
            expect(next.status).toBe(seeded.status);
        });

        it('should adopt the resolved buffer bytes when the fetcher pre-resolved them', () => {
            const compressed = deflate(new TextEncoder().encode('{"name":"resolved"}'));
            const builderWithBuffer = createAnchorIdlHistoryBuilder(PROGRAM, {
                bufferContents: new Map([['set-buffer-sig', compressed]]),
            });
            const next = builderWithBuffer.applyEvent(activeState(), {
                ...BASE_EVENT,
                bufferAccount: 'foreign-buf',
                instructionType: InstructionType.SetBuffer,
                signature: 'set-buffer-sig',
            });
            expect(next.status).toBe(AccountStatus.Active);
            expect(next.dataSize).toBe(compressed.length);
            expect(next.content).toContain('"resolved"');
        });
    });

    describe('Resize / CreateBuffer', () => {
        it('should return prev unchanged (no impact on virtual state)', () => {
            const seeded = activeState();
            expect(builder.applyEvent(seeded, { ...BASE_EVENT, instructionType: InstructionType.Resize })).toBe(seeded);
            expect(builder.applyEvent(seeded, { ...BASE_EVENT, instructionType: InstructionType.CreateBuffer })).toBe(
                seeded,
            );
        });
    });
});

function activeState(overrides: Partial<AnchorIdlState> = {}): AnchorIdlState {
    return {
        ...builder.initialState,
        authority: 'old-authority',
        content: 'old-content',
        dataSize: 100,
        mutable: true,
        status: AccountStatus.Active,
        ...overrides,
    };
}
