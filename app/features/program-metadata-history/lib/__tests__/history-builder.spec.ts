import { AccountStatus } from '@entities/account-history';
import { Compression, DataSource, Encoding, Format } from '@solana-program/program-metadata';
import { describe, expect, it } from 'vitest';

import { createMetadataHistoryBuilder } from '../history-builder';
import type { MetadataEvent, MetadataState } from '../types';
import { InstructionType } from '../types';

const builder = createMetadataHistoryBuilder();

const BASE_EVENT: MetadataEvent = {
    blockTime: 1700000000,
    failed: false,
    instructionType: InstructionType.Allocate,
    signature: 'sig',
    slot: 100,
};

function activeState(overrides: Partial<MetadataState> = {}): MetadataState {
    return {
        ...builder.initialState,
        authority: 'old-authority',
        canonical: true,
        compression: Compression.Zlib,
        content: 'old-content',
        dataSize: 100,
        dataSource: DataSource.Direct,
        encoding: Encoding.Utf8,
        format: Format.Json,
        mutable: true,
        status: AccountStatus.Active,
        ...overrides,
    };
}

describe('PMP applyEvent', () => {
    describe('Allocate', () => {
        it('should mark status Pending and clear buffer counters', () => {
            const next = builder.applyEvent(activeState(), {
                ...BASE_EVENT,
                instructionType: InstructionType.Allocate,
            });
            expect(next.status).toBe(AccountStatus.Pending);
            expect(next.bufferData.length).toBe(0);
            expect(next.bufferBytesWritten).toBe(0);
        });

        it('should preserve authority and content across Allocate', () => {
            const next = builder.applyEvent(activeState(), {
                ...BASE_EVENT,
                instructionType: InstructionType.Allocate,
            });
            expect(next.authority).toBe('old-authority');
            expect(next.content).toBe('old-content');
            expect(next.mutable).toBe(true);
        });
    });

    describe('Write', () => {
        it('should append rawData at the given offset and grow the buffer if needed', () => {
            const a = builder.applyEvent(builder.initialState, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: new Uint8Array([1, 2]),
                writeOffset: 0,
            });
            const b = builder.applyEvent(a, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: new Uint8Array([3, 4]),
                writeOffset: 2,
            });
            expect(Array.from(b.bufferData)).toEqual([1, 2, 3, 4]);
            expect(b.bufferBytesWritten).toBe(4);
            expect(b.status).toBe(AccountStatus.Pending);
        });

        it('should overwrite existing bytes when offset overlaps', () => {
            const a = builder.applyEvent(builder.initialState, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: new Uint8Array([1, 2, 3, 4]),
                writeOffset: 0,
            });
            const b = builder.applyEvent(a, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: new Uint8Array([9, 9]),
                writeOffset: 1,
            });
            expect(Array.from(b.bufferData)).toEqual([1, 9, 9, 4]);
        });

        it('should bump status to Pending without mutating the buffer when rawData is empty', () => {
            const seeded = activeState();
            const next = builder.applyEvent(seeded, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: new Uint8Array(0),
                writeOffset: 0,
            });
            expect(next.status).toBe(AccountStatus.Pending);
            expect(next.content).toBe('old-content'); // preserved from prev
        });
    });

    describe('Initialize', () => {
        it('should decode the accumulated buffer when no inline rawData is provided', () => {
            const written = builder.applyEvent(builder.initialState, {
                ...BASE_EVENT,
                instructionType: InstructionType.Write,
                rawData: new TextEncoder().encode('hello'),
                writeOffset: 0,
            });
            const finalized = builder.applyEvent(written, {
                ...BASE_EVENT,
                compression: Compression.None,
                dataSource: DataSource.Direct,
                encoding: Encoding.Utf8,
                format: Format.None,
                instructionType: InstructionType.Initialize,
            });
            expect(finalized.status).toBe(AccountStatus.Active);
            expect(finalized.content).toBe('hello');
            expect(finalized.dataSize).toBe(5);
            expect(finalized.bufferBytesWritten).toBe(0);
        });

        it('should reset mutable to true regardless of prior value', () => {
            const seeded = activeState({ mutable: false });
            const next = builder.applyEvent(seeded, {
                ...BASE_EVENT,
                compression: Compression.None,
                dataSource: DataSource.Direct,
                encoding: Encoding.Utf8,
                format: Format.None,
                instructionType: InstructionType.Initialize,
                rawData: new TextEncoder().encode('x'),
            });
            expect(next.mutable).toBe(true);
        });
    });

    describe('SetData', () => {
        it('should preserve mutable from prev (unlike Initialize)', () => {
            const seeded = activeState({ mutable: false });
            const next = builder.applyEvent(seeded, {
                ...BASE_EVENT,
                compression: Compression.None,
                dataSource: DataSource.Direct,
                encoding: Encoding.Utf8,
                format: Format.None,
                instructionType: InstructionType.SetData,
                rawData: new TextEncoder().encode('x'),
            });
            expect(next.mutable).toBe(false);
        });
    });

    describe('SetAuthority', () => {
        it('should update authority and preserve all other state', () => {
            const seeded = activeState();
            const next = builder.applyEvent(seeded, {
                ...BASE_EVENT,
                instructionType: InstructionType.SetAuthority,
                newAuthority: 'new-authority',
            });
            expect(next.authority).toBe('new-authority');
            expect(next.content).toBe(seeded.content);
            expect(next.dataSize).toBe(seeded.dataSize);
            expect(next.status).toBe(seeded.status);
        });
    });

    describe('SetImmutable', () => {
        it('should flip mutable to false', () => {
            const seeded = activeState();
            const next = builder.applyEvent(seeded, { ...BASE_EVENT, instructionType: InstructionType.SetImmutable });
            expect(next.mutable).toBe(false);
        });
    });

    describe('Close', () => {
        it('should reset to a closed empty state and drop authority/content', () => {
            const next = builder.applyEvent(activeState(), { ...BASE_EVENT, instructionType: InstructionType.Close });
            expect(next.status).toBe(AccountStatus.Closed);
            expect(next.dataSize).toBe(0);
            expect(next.content).toBeUndefined();
            expect(next.authority).toBeUndefined();
        });
    });

    describe('Trim / Extend', () => {
        it('should return prev unchanged (size-only on-chain ops have no virtual-state impact)', () => {
            const seeded = activeState();
            expect(builder.applyEvent(seeded, { ...BASE_EVENT, instructionType: InstructionType.Trim })).toBe(seeded);
            expect(builder.applyEvent(seeded, { ...BASE_EVENT, instructionType: InstructionType.Extend })).toBe(seeded);
        });
    });
});
