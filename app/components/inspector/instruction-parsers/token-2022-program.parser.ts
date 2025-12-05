import {
    EmitTokenMetadataInfo,
    InitializeMetadataPointerInfo,
    InitializeTokenMetadataInfo,
    RemoveTokenMetadataKeyInfo,
    UpdateMetadataPointerInfo,
    UpdateTokenMetadataFieldInfo,
    UpdateTokenMetadataUpdateAuthorityInfo,
} from '@components/instruction/token/types';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
    identifyToken2022Instruction,
    parseEmitTokenMetadataInstruction,
    parseInitializeMetadataPointerInstruction,
    parseInitializeTokenMetadataInstruction,
    parseRemoveTokenMetadataKeyInstruction,
    parseUpdateMetadataPointerInstruction,
    parseUpdateTokenMetadataFieldInstruction,
    parseUpdateTokenMetadataUpdateAuthorityInstruction,
    Token2022Instruction,
} from '@solana-program/token-2022';

import { intoInstructionData } from '../into-parsed-data';

/**
 * Helper function to safely convert BigInt or number to regular number
 */
function safeNumber(value: bigint | number): number {
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return value;
}

/**
 * Helper function to convert TokenMetadataField to a string representation
 * Standard fields: Name, Symbol, Uri -> lowercase
 * Custom key field: Key with fields[0] containing the key name
 */
function tokenMetadataFieldToString(field: { __kind: string; fields?: readonly [string] }): string {
    return field.fields?.[0] ?? field.__kind.toLowerCase();
}

/**
 * Convert parsed Token-2022 InitializeTokenMetadata instruction to RPC format
 */
function convertInitializeTokenMetadataInfo(parsed: any): InitializeTokenMetadataInfo {
    return {
        metadata: new PublicKey(parsed.accounts.metadata.address),
        mint: new PublicKey(parsed.accounts.mint.address),
        mintAuthority: new PublicKey(parsed.accounts.mintAuthority.address),
        name: parsed.data.name,
        symbol: parsed.data.symbol,
        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
        uri: parsed.data.uri,
    };
}

/**
 * Convert parsed Token-2022 UpdateTokenMetadataField instruction to RPC format
 */
function convertUpdateTokenMetadataFieldInfo(parsed: any): UpdateTokenMetadataFieldInfo {
    return {
        field: tokenMetadataFieldToString(parsed.data.field),
        metadata: new PublicKey(parsed.accounts.metadata.address),
        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
        value: parsed.data.value,
    };
}

/**
 * Convert parsed Token-2022 RemoveTokenMetadataKey instruction to RPC format
 */
function convertRemoveTokenMetadataKeyInfo(parsed: any): RemoveTokenMetadataKeyInfo {
    return {
        idempotent: parsed.data.idempotent,
        key: parsed.data.key,
        metadata: new PublicKey(parsed.accounts.metadata.address),
        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
    };
}

/**
 * Convert parsed Token-2022 UpdateTokenMetadataUpdateAuthority instruction to RPC format
 */
function convertUpdateTokenMetadataUpdateAuthorityInfo(parsed: any): UpdateTokenMetadataUpdateAuthorityInfo {
    return {
        metadata: new PublicKey(parsed.accounts.metadata.address),
        newUpdateAuthority: new PublicKey(parsed.data.newUpdateAuthority),
        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
    };
}

/**
 * Convert parsed Token-2022 EmitTokenMetadata instruction to RPC format
 */
function convertEmitTokenMetadataInfo(parsed: any): EmitTokenMetadataInfo {
    return {
        end: parsed.data.end ? safeNumber(parsed.data.end) : null,
        metadata: new PublicKey(parsed.accounts.metadata.address),
        start: parsed.data.start ? safeNumber(parsed.data.start) : null,
    };
}

/**
 * Convert parsed Token-2022 InitializeMetadataPointer instruction to RPC format
 */
function convertInitializeMetadataPointerInfo(parsed: any): InitializeMetadataPointerInfo {
    return {
        authority: new PublicKey(parsed.data.authority),
        metadataAddress: new PublicKey(parsed.data.metadataAddress),
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Convert parsed Token-2022 UpdateMetadataPointer instruction to RPC format
 */
function convertUpdateMetadataPointerInfo(parsed: any): UpdateMetadataPointerInfo {
    return {
        authority: new PublicKey(parsed.accounts.authority.address),
        metadataAddress: parsed.data.metadataAddress ? new PublicKey(parsed.data.metadataAddress) : null,
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Parse Token-2022 instruction and return parsed data in RPC format
 */
export function parseToken2022Instruction(instruction: TransactionInstruction): { type: string; info: any } | null {
    const { data } = instruction;

    try {
        const instructionType = identifyToken2022Instruction(data);

        switch (instructionType) {
            case Token2022Instruction.InitializeTokenMetadata: {
                const idata = intoInstructionData(instruction);
                const parsedIx = parseInitializeTokenMetadataInstruction(idata);
                return {
                    info: convertInitializeTokenMetadataInfo(parsedIx),
                    type: 'initializeTokenMetadata',
                };
            }
            case Token2022Instruction.UpdateTokenMetadataField: {
                const idata = intoInstructionData(instruction);
                const parsedIx = parseUpdateTokenMetadataFieldInstruction(idata);
                return {
                    info: convertUpdateTokenMetadataFieldInfo(parsedIx),
                    type: 'updateTokenMetadataField',
                };
            }
            case Token2022Instruction.RemoveTokenMetadataKey: {
                const idata = intoInstructionData(instruction);
                const parsedIx = parseRemoveTokenMetadataKeyInstruction(idata);
                return {
                    info: convertRemoveTokenMetadataKeyInfo(parsedIx),
                    type: 'removeTokenMetadataKey',
                };
            }
            case Token2022Instruction.UpdateTokenMetadataUpdateAuthority: {
                const idata = intoInstructionData(instruction);
                const parsedIx = parseUpdateTokenMetadataUpdateAuthorityInstruction(idata);
                return {
                    info: convertUpdateTokenMetadataUpdateAuthorityInfo(parsedIx),
                    type: 'updateTokenMetadataUpdateAuthority',
                };
            }
            case Token2022Instruction.EmitTokenMetadata: {
                const idata = intoInstructionData(instruction);
                const parsedIx = parseEmitTokenMetadataInstruction(idata);
                return {
                    info: convertEmitTokenMetadataInfo(parsedIx),
                    type: 'emitTokenMetadata',
                };
            }
            case Token2022Instruction.InitializeMetadataPointer: {
                const idata = intoInstructionData(instruction);
                const parsedIx = parseInitializeMetadataPointerInstruction(idata);
                return {
                    info: convertInitializeMetadataPointerInfo(parsedIx),
                    type: 'initializeMetadataPointer',
                };
            }
            case Token2022Instruction.UpdateMetadataPointer: {
                const idata = intoInstructionData(instruction);
                const parsedIx = parseUpdateMetadataPointerInstruction(idata);
                return {
                    info: convertUpdateMetadataPointerInfo(parsedIx),
                    type: 'updateMetadataPointer',
                };
            }
            default: {
                return null;
            }
        }
    } catch {
        return null;
    }
}
