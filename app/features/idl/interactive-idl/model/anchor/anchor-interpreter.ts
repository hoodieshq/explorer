import { AnchorProvider, Idl as AnchorIdl, Program as AnchorProgram, Wallet } from '@coral-xyz/anchor';
import { formatSerdeIdl, getFormattedIdl } from '@entities/idl/format';
import { normalizeIdl } from '@entities/idl/model/use-anchor-program';
import { Connection, PublicKey } from '@solana/web3.js';

import { IdlInterpreter } from '../idl-interpreter.d';
import { UnifiedAccounts, UnifiedArguments, UnifiedProgram } from '../unified-program.d';
import { AnchorUnifiedProgram } from './anchor-program';

/**
 * Anchor IDL interpreter
 */
export class AnchorInterpreter implements IdlInterpreter<AnchorIdl> {
    name = 'anchor';

    canHandle(idl: any): boolean {
        // Check for Anchor-specific fields
        return (
            idl &&
            typeof idl === 'object' &&
            'version' in idl &&
            'name' in idl &&
            'instructions' in idl &&
            Array.isArray(idl.instructions)
        );
    }

    async createProgram(
        connection: Connection,
        wallet: Wallet,
        programId: PublicKey | string,
        idl: AnchorIdl
    ): Promise<UnifiedProgram> {
        const publicKey = typeof programId === 'string' ? new PublicKey(programId) : programId;

        // Create provider
        const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

        const pubkey = publicKey.toBase58();

        // Perform normalization against formatted Idl to fill missing address where needed
        const properIdl = normalizeIdl(getFormattedIdl(formatSerdeIdl, idl, pubkey), pubkey);

        // Create Anchor program
        let anchorProgram: AnchorProgram;
        try {
            anchorProgram = new AnchorProgram(properIdl, provider);
        } catch (error) {
            throw new Error(
                `Failed to create Anchor program: ${error instanceof Error ? error.message : String(error)}`
            );
        }

        return new AnchorUnifiedProgram(publicKey, idl, anchorProgram, connection);
    }

    async createInstruction<T extends AnchorUnifiedProgram>(
        program: T,
        instructionName: string,
        accounts: UnifiedAccounts,
        args: UnifiedArguments
    ) {
        return program.buildInstruction(instructionName, args, accounts);
    }
}

function _serializeArguments(instructionNode: any, args: Record<string, any>): Buffer {
    // This is a simplified serialization
    // In practice, you'd need to implement proper Borsh serialization
    // based on the instruction's argument types from the IDL

    const buffers: Buffer[] = [];

    for (const arg of instructionNode.args || []) {
        const value = args[arg.name];
        if (value === undefined) {
            throw new Error(`Missing required argument: ${arg.name}`);
        }

        // Serialize based on type - this is simplified
        const serialized = serializeValue(value, arg.type);
        buffers.push(serialized);
    }

    return Buffer.concat(buffers);
}

function serializeValue(value: any, type: string): Buffer {
    // Simplified serialization - you'll need proper Borsh implementation
    switch (type) {
        case 'u8':
            return Buffer.from([value]);
        case 'u16': {
            const buf16 = Buffer.alloc(2);
            buf16.writeUInt16LE(value, 0);
            return buf16;
        }
        case 'u32': {
            const buf32 = Buffer.alloc(4);
            buf32.writeUInt32LE(value, 0);
            return buf32;
        }
        case 'u64': {
            const buf64 = Buffer.alloc(8);
            buf64.writeBigUInt64LE(BigInt(value), 0);
            return buf64;
        }
        case 'string': {
            const textEncoder = new TextEncoder();
            const stringBytes = textEncoder.encode(value);
            const lengthBuf = Buffer.alloc(4);
            lengthBuf.writeUInt32LE(stringBytes.length, 0);
            return Buffer.concat([lengthBuf, stringBytes]);
        }
        case 'publicKey':
            return new PublicKey(value).toBuffer();
        default:
            throw new Error(`Unsupported type: ${type}`);
    }
}
