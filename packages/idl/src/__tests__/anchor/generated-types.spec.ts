// Runtime half of the anchor-generated-types samples — the real generated program through OUR client and anchor's own coders.
import { BN, BorshAccountsCoder, BorshEventCoder, BorshInstructionCoder } from '@coral-xyz/anchor';
import { describe, expect, it } from 'vitest';

import { createIdlClient, isAnchorStandard } from '../../client';
import { getIdlProgramVersion, getIdlStandard, isAnchorIdl } from '../../detect';
import { IdlStandard } from '../../types';
import { incrementIx, loadSimpleIdl, u64le } from '../fixtures';

describe('anchor-generated simple program — detection and names', () => {
    it('should detect the generated IDL as a modern Anchor document', () => {
        const simple = loadSimpleIdl();
        expect(isAnchorIdl(simple)).toBe(true);
        expect(getIdlStandard(simple)).toBe(IdlStandard.Anchor);
        expect(getIdlProgramVersion(simple)).toBe('0.1.0');
    });

    it('should serve names and metadata from the generated IDL through the client', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);
        expect(isAnchorStandard(client)).toBe(true);
        expect(client.programAddress()).toBe(simple.address);
        expect(client.programName()).toBe('Simple');
        expect(client.instructionName(incrementIx(simple).data)).toBe('Increment');
    });
});

describe('anchor-generated simple program — anchor coder round-trips', () => {
    it('should decode the increment instruction with BorshInstructionCoder', () => {
        const simple = loadSimpleIdl();
        const decoded = new BorshInstructionCoder(simple).decode(Buffer.from(incrementIx(simple).data));
        expect(decoded?.name).toBe('increment');
        // BN internals pad differently after decode — compare by value, not structure
        const args = decoded?.data as { amount: BN } | undefined;
        expect(args?.amount.eq(new BN(42))).toBe(true);
    });

    it('should decode the counter account with BorshAccountsCoder', () => {
        const simple = loadSimpleIdl();
        const counter = simple.accounts?.[0];
        // Counter = authority pubkey (32 bytes) + count u64 behind the 8-byte account discriminator
        const data = Buffer.from([...(counter?.discriminator ?? []), ...new Uint8Array(32), ...u64le(1000n)]);
        const account = new BorshAccountsCoder(simple).decode<{ count: BN }>(counter?.name ?? '', data);
        expect(account.count.eq(new BN(1000))).toBe(true);
    });

    it('should decode the counterIncremented event with BorshEventCoder', () => {
        const simple = loadSimpleIdl();
        const event = simple.events?.[0];
        const log = Buffer.from([...(event?.discriminator ?? []), ...u64le(42n)]).toString('base64');
        const decoded = new BorshEventCoder(simple).decode(log);
        expect(decoded?.name).toBe(event?.name);
        const payload = decoded?.data as { count: BN } | undefined;
        expect(payload?.count.eq(new BN(42))).toBe(true);
    });
});
