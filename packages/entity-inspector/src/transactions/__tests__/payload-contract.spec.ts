// Byte-level pin on the transaction payload. The snapshots hold JSON text, not objects, so a change in
// key order fails here too. Regenerate them only when the MCP contract itself changes.
import { getBase58Decoder } from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';

import type { InspectorLogger } from '../../logger.js';
import { gen, testAddress } from '../../__tests__/gen.js';
import type { SignatureStatusEnvelope } from '../../rpc/types.js';
import { buildTransactionPayload } from '../build-payload.js';
import { decodeTransactionInstructions } from '../decode-instructions.js';
import { normalizeTransactionProbe } from '../normalizer.js';

const SIGNATURE = 'payload-contract-signature';

const FEE_PAYER = testAddress(1);
const READONLY_SIGNER = testAddress(2);
const WRITABLE_NON_SIGNER = testAddress(3);
const OPAQUE_PROGRAM = testAddress(4);
const LOOKUP_TABLE_A = testAddress(10);
const LOOKUP_TABLE_B = testAddress(11);
const LOADED_WRITABLE_A = testAddress(21);
const LOADED_WRITABLE_B = testAddress(22);
const LOADED_READONLY_A = testAddress(31);
const BLOCKHASH = testAddress(41);

const OPAQUE_INSTRUCTION_DATA = '3Bxs';
const OPAQUE_INNER_INSTRUCTION_DATA = 'abc';

function systemTransferData(lamports: number): string {
    const data = new Uint8Array(12);
    const view = new DataView(data.buffer);
    view.setUint32(0, 2, true);
    view.setBigUint64(4, BigInt(lamports), true);
    return getBase58Decoder().decode(data);
}

function logger(): InspectorLogger {
    return { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

function legacyEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        blockTime: 1727000000,
        meta: {
            computeUnitsConsumed: 4821,
            err: null,
            fee: 5000,
            innerInstructions: [
                {
                    index: 0,
                    instructions: [{ accounts: [0], data: OPAQUE_INNER_INSTRUCTION_DATA, programIdIndex: 4 }],
                },
            ],
            logMessages: ['Program 11111111111111111111111111111111 invoke [1]', 'Program success'],
        },
        slot: 320145678,
        transaction: {
            message: {
                accountKeys: [FEE_PAYER, READONLY_SIGNER, WRITABLE_NON_SIGNER, gen.systemProgram, OPAQUE_PROGRAM],
                header: {
                    numReadonlySignedAccounts: 1,
                    numReadonlyUnsignedAccounts: 2,
                    numRequiredSignatures: 2,
                },
                instructions: [
                    { accounts: [0, 2], data: systemTransferData(1000), programIdIndex: 3 },
                    { accounts: [1], data: OPAQUE_INSTRUCTION_DATA, programIdIndex: 4 },
                ],
                recentBlockhash: BLOCKHASH,
            },
        },
        version: 'legacy',
        ...overrides,
    };
}

function v0Envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        blockTime: 1727000111,
        meta: {
            computeUnitsConsumed: 1200,
            err: { InstructionError: [0, 'Custom'] },
            fee: 10000,
            loadedAddresses: {
                readonly: [LOADED_READONLY_A],
                writable: [LOADED_WRITABLE_A, LOADED_WRITABLE_B],
            },
            logMessages: null,
        },
        slot: 320145999,
        transaction: {
            message: {
                accountKeys: [FEE_PAYER, gen.systemProgram],
                addressTableLookups: [
                    { accountKey: LOOKUP_TABLE_A, readonlyIndexes: [7], writableIndexes: [3] },
                    { accountKey: LOOKUP_TABLE_B, readonlyIndexes: [], writableIndexes: [4] },
                ],
                header: {
                    numReadonlySignedAccounts: 0,
                    numReadonlyUnsignedAccounts: 1,
                    numRequiredSignatures: 1,
                },
                instructions: [{ accounts: [0, 2], data: systemTransferData(77), programIdIndex: 1 }],
                recentBlockhash: BLOCKHASH,
            },
        },
        version: 0,
        ...overrides,
    };
}

function v1Envelope(): Record<string, unknown> {
    return {
        blockTime: 1727000222,
        meta: { computeUnitsConsumed: 450, err: null, fee: 5000, logMessages: null },
        slot: 320146222,
        transaction: {
            message: {
                accountKeys: [FEE_PAYER, WRITABLE_NON_SIGNER, gen.systemProgram],
                header: {
                    numReadonlySignedAccounts: 0,
                    numReadonlyUnsignedAccounts: 1,
                    numRequiredSignatures: 1,
                },
                instructions: [{ accounts: [0, 1], data: systemTransferData(500), programIdIndex: 2 }],
                recentBlockhash: BLOCKHASH,
            },
        },
        version: 1,
    };
}

function statusEnvelope(): SignatureStatusEnvelope {
    return { value: { confirmationStatus: 'confirmed', confirmations: 12 } };
}

async function payloadJson(
    envelope: Record<string, unknown>,
    signatureStatus: SignatureStatusEnvelope | null = statusEnvelope(),
): Promise<string> {
    const log = logger();
    const context = normalizeTransactionProbe(SIGNATURE, envelope as never, signatureStatus, log);
    if (context === null) {
        throw new Error('expected a normalized transaction context');
    }
    const instructions = await decodeTransactionInstructions(context, { logger: log });
    return JSON.stringify(buildTransactionPayload(context, instructions));
}

describe('transaction payload contract', () => {
    it('should keep the legacy payload byte-identical', async () => {
        expect(await payloadJson(legacyEnvelope())).toMatchSnapshot();
    });

    it('should report a null transaction_version when the envelope omits it', async () => {
        const json = await payloadJson(legacyEnvelope({ version: undefined }));

        expect(json).toContain('"transaction_version":null');
        expect(json).toMatchSnapshot();
    });

    it('should keep the v0 payload byte-identical', async () => {
        expect(await payloadJson(v0Envelope())).toMatchSnapshot();
    });

    it('should report a v1 transaction with its static accounts and decoded instruction', async () => {
        const { entity } = JSON.parse(await payloadJson(v1Envelope()));

        expect(entity.transaction_version).toBe(1);
        expect(entity.accounts).toEqual([
            { address: FEE_PAYER, signer: true, source: 'static', writable: true },
            { address: WRITABLE_NON_SIGNER, signer: false, source: 'static', writable: true },
            { address: gen.systemProgram, signer: false, source: 'static', writable: false },
        ]);
        expect(entity.signers).toEqual([FEE_PAYER]);
        expect(entity.instructions).toEqual([
            {
                accounts: [FEE_PAYER, WRITABLE_NON_SIGNER],
                data: systemTransferData(500),
                decoded: {
                    info: { destination: WRITABLE_NON_SIGNER, lamports: 500, source: FEE_PAYER },
                    program: 'system',
                    type: 'transfer',
                },
                inner_instructions: [],
                program_id: gen.systemProgram,
                source: 'bundled',
            },
        ]);
        expect(entity.status).toBe('success');
    });
});
