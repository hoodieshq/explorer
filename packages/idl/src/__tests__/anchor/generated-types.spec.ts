// Runtime half of the anchor-generated-types samples — the vault program through OUR client and anchor's own coders (decode wiring Pieces A/B will productize).
import { BN, BorshAccountsCoder, BorshEventCoder, BorshInstructionCoder } from '@coral-xyz/anchor';
import { describe, expect, it } from 'vitest';

import { createIdlClient, isAnchorStandard } from '../../client';
import { getIdlProgramVersion, getIdlStandard, isAnchorIdl } from '../../detect';
import { IdlStandard } from '../../types';
import {
    u64le,
    VAULT_ACCOUNT_DISCRIMINATOR,
    VAULT_EVENT_DISCRIMINATOR,
    VAULT_PROGRAM_ADDRESS,
    vaultDepositIx,
    vaultIdl,
} from '../fixtures';

describe('anchor-generated vault program — package integration', () => {
    it('should detect the generated IDL as a modern Anchor document', () => {
        expect(isAnchorIdl(vaultIdl)).toBe(true);
        expect(getIdlStandard(vaultIdl)).toBe(IdlStandard.Anchor);
        expect(getIdlProgramVersion(vaultIdl)).toBe('0.1.0');
    });

    it('should serve names and metadata from the generated IDL through the client', () => {
        const client = createIdlClient(vaultIdl);
        expect(isAnchorStandard(client)).toBe(true);
        expect(client.programAddress()).toBe(VAULT_PROGRAM_ADDRESS);
        expect(client.programName()).toBe('Vault');
        expect(client.instructionName(vaultDepositIx.data)).toBe('Deposit');
    });
});

describe('anchor-generated vault program — anchor coder round-trips', () => {
    it('should decode the deposit instruction with BorshInstructionCoder', () => {
        const decoded = new BorshInstructionCoder(vaultIdl).decode(Buffer.from(vaultDepositIx.data));
        expect(decoded?.name).toBe('deposit');
        // BN internals pad differently after decode — compare by value, not structure
        const args = decoded?.data as { amount: BN } | undefined;
        expect(args?.amount.eq(new BN(42))).toBe(true);
    });

    it('should decode the vault account with BorshAccountsCoder', () => {
        const data = Buffer.from([...VAULT_ACCOUNT_DISCRIMINATOR, ...u64le(1000n)]);
        const account = new BorshAccountsCoder(vaultIdl).decode<{ balance: BN }>('vault', data);
        expect(account.balance.eq(new BN(1000))).toBe(true);
    });

    it('should decode the depositMade event with BorshEventCoder', () => {
        const log = Buffer.from([...VAULT_EVENT_DISCRIMINATOR, ...u64le(42n)]).toString('base64');
        const event = new BorshEventCoder(vaultIdl).decode(log);
        expect(event?.name).toBe('depositMade');
        const payload = event?.data as { amount: BN } | undefined;
        expect(payload?.amount.eq(new BN(42))).toBe(true);
    });

    it('should expose the error table for consumer-side error mapping', () => {
        expect(vaultIdl.errors[0]).toEqual({ code: 6000, msg: 'Insufficient funds', name: 'insufficientFunds' });
    });
});
