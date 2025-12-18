import {
    EmitTokenMetadataInfo,
    InitializeGroupMemberPointerInfo,
    InitializeGroupPointerInfo,
    InitializeMetadataPointerInfo,
    InitializeTokenGroupInfo,
    InitializeTokenGroupMemberInfo,
    InitializeTokenMetadataInfo,
    RemoveTokenMetadataKeyInfo,
    UpdateGroupMemberPointerInfo,
    UpdateGroupPointerInfo,
    UpdateMetadataPointerInfo,
    UpdateTokenGroupMaxSizeInfo,
    UpdateTokenGroupUpdateAuthorityInfo,
    UpdateTokenMetadataFieldInfo,
    UpdateTokenMetadataUpdateAuthorityInfo,
} from '@components/instruction/token/types';
import { type Option, unwrapOption } from '@solana/options';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import bs58 from 'bs58';
import {
    identifyToken2022Instruction,
    parseEmitTokenMetadataInstruction,
    parseInitializeGroupMemberPointerInstruction,
    parseInitializeGroupPointerInstruction,
    parseInitializeMetadataPointerInstruction,
    parseInitializeMintInstruction,
    parseInitializeTokenGroupInstruction,
    parseInitializeTokenGroupMemberInstruction,
    parseInitializeTokenMetadataInstruction,
    parseRemoveTokenMetadataKeyInstruction,
    parseUpdateGroupMemberPointerInstruction,
    parseUpdateGroupPointerInstruction,
    parseUpdateMetadataPointerInstruction,
    parseUpdateTokenGroupMaxSizeInstruction,
    parseUpdateTokenGroupUpdateAuthorityInstruction,
    parseUpdateTokenMetadataFieldInstruction,
    parseUpdateTokenMetadataUpdateAuthorityInstruction,
    Token2022Instruction,
} from '@solana-program/token-2022';

import { intoInstructionData, TInstruction } from '../into-parsed-data';

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
 * Custom parser for InitializeTokenMetadata instruction.
 * The library's decoder has a bug where getBytesDecoder() is used without a fixed size
 * for the discriminator, causing it to consume all remaining bytes.
 *
 * Instruction data format:
 * - 8 bytes: discriminator
 * - u32 + string: name (length-prefixed)
 * - u32 + string: symbol (length-prefixed)
 * - u32 + string: uri (length-prefixed)
 *
 * Accounts: metadata, updateAuthority, mint, mintAuthority
 */
function parseInitializeTokenMetadataInstructionCustom(instruction: TInstruction): {
    accounts: {
        metadata: { address: string };
        updateAuthority: { address: string };
        mint: { address: string };
        mintAuthority: { address: string };
    };
    data: {
        name: string;
        symbol: string;
        uri: string;
    };
} {
    const data = instruction.data;
    const accounts = instruction.accounts;

    if (accounts.length < 4) {
        throw new Error('Not enough accounts for InitializeTokenMetadata');
    }

    // Skip the 8-byte discriminator
    let offset = 8;

    // Read name (u32 length + string)
    const nameLength = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
    offset += 4;
    const name = new TextDecoder().decode(data.slice(offset, offset + nameLength));
    offset += nameLength;

    // Read symbol (u32 length + string)
    const symbolLength = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
    offset += 4;
    const symbol = new TextDecoder().decode(data.slice(offset, offset + symbolLength));
    offset += symbolLength;

    // Read uri (u32 length + string)
    const uriLength = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
    offset += 4;
    const uri = new TextDecoder().decode(data.slice(offset, offset + uriLength));

    return {
        accounts: {
            metadata: { address: accounts[0].address },
            mintAuthority: { address: accounts[3].address },
            mint: { address: accounts[2].address },
            updateAuthority: { address: accounts[1].address },
        },
        data: {
            name,
            symbol,
            uri,
        },
    };
}

/**
 * Custom parser for UpdateTokenMetadataUpdateAuthority instruction.
 * The library's decoder has a bug where getBytesDecoder() is used without a fixed size
 * for the discriminator, causing it to consume all remaining bytes.
 *
 * Instruction data format:
 * - 8 bytes: discriminator
 * - 32 bytes: newUpdateAuthority (Option encoded as address or 32 zero bytes for None)
 *
 * Accounts: metadata, updateAuthority
 */
function parseUpdateTokenMetadataUpdateAuthorityInstructionCustom(instruction: TInstruction): {
    accounts: {
        metadata: { address: string };
        updateAuthority: { address: string };
    };
    data: {
        newUpdateAuthority: string | null;
    };
} {
    const data = instruction.data;
    const accounts = instruction.accounts;

    if (accounts.length < 2) {
        throw new Error('Not enough accounts for UpdateTokenMetadataUpdateAuthority');
    }

    // Skip the 8-byte discriminator
    const offset = 8;

    // Read newUpdateAuthority (32 bytes - either an address or 32 zero bytes for None)
    const authorityBytes = data.slice(offset, offset + 32);
    const isZero = authorityBytes.every(b => b === 0);
    const newUpdateAuthority = isZero ? null : bs58.encode(authorityBytes);

    return {
        accounts: {
            metadata: { address: accounts[0].address },
            updateAuthority: { address: accounts[1].address },
        },
        data: {
            newUpdateAuthority,
        },
    };
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
 * Convert parsed Token-2022 InitializeMint instruction to RPC format
 */
function convertInitializeMintInfo(parsed: unknown) {
    const typedParsed = parsed as {
        data: { decimals: number; freezeAuthority: unknown; mintAuthority: unknown };
        accounts: { mint: { address: unknown }; rent: { address: unknown } };
    };

    const freezeAuthority = unwrapOption(typedParsed.data.freezeAuthority as Option<unknown>);

    return {
        decimals: typedParsed.data.decimals,
        freezeAuthority: freezeAuthority ? new PublicKey(freezeAuthority as PublicKey) : null,
        mint: new PublicKey(typedParsed.accounts.mint.address as PublicKey),
        mintAuthority: new PublicKey(typedParsed.data.mintAuthority as PublicKey),
        rentSysvar: new PublicKey(typedParsed.accounts.rent.address as PublicKey),
    };
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
    const newUpdateAuthority = unwrapOption(parsed.data.newUpdateAuthority);

    return {
        metadata: new PublicKey(parsed.accounts.metadata.address),
        newUpdateAuthority: newUpdateAuthority
            ? new PublicKey(newUpdateAuthority)
            : new PublicKey(parsed.accounts.metadata.address),
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
    const authority = unwrapOption(parsed.data.authority);
    const metadataAddress = unwrapOption(parsed.data.metadataAddress);

    return {
        authority: authority ? new PublicKey(authority) : new PublicKey(parsed.accounts.mint.address),
        metadataAddress: metadataAddress ? new PublicKey(metadataAddress) : new PublicKey(parsed.accounts.mint.address),
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Convert parsed Token-2022 UpdateMetadataPointer instruction to RPC format
 */
function convertUpdateMetadataPointerInfo(parsed: any): UpdateMetadataPointerInfo {
    const metadataAddress = unwrapOption(parsed.data.metadataAddress);

    return {
        authority: new PublicKey(parsed.accounts.metadataPointerAuthority.address),
        metadataAddress: metadataAddress ? new PublicKey(metadataAddress) : null,
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Convert parsed Token-2022 InitializeGroupPointer instruction to RPC format
 */
function convertInitializeGroupPointerInfo(parsed: any): InitializeGroupPointerInfo {
    const authority = unwrapOption(parsed.data.authority);
    const groupAddress = unwrapOption(parsed.data.groupAddress);

    return {
        authority: authority ? new PublicKey(authority) : new PublicKey(parsed.accounts.mint.address),
        groupAddress: groupAddress ? new PublicKey(groupAddress) : new PublicKey(parsed.accounts.mint.address),
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Convert parsed Token-2022 UpdateGroupPointer instruction to RPC format
 */
function convertUpdateGroupPointerInfo(parsed: any): UpdateGroupPointerInfo {
    const groupAddress = unwrapOption(parsed.data.groupAddress);

    return {
        authority: new PublicKey(parsed.accounts.groupPointerAuthority.address),
        groupAddress: groupAddress ? new PublicKey(groupAddress) : null,
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Convert parsed Token-2022 InitializeGroupMemberPointer instruction to RPC format
 */
function convertInitializeGroupMemberPointerInfo(parsed: any): InitializeGroupMemberPointerInfo {
    const authority = unwrapOption(parsed.data.authority);
    const memberAddress = unwrapOption(parsed.data.memberAddress);

    return {
        authority: authority ? new PublicKey(authority) : new PublicKey(parsed.accounts.mint.address),
        memberAddress: memberAddress ? new PublicKey(memberAddress) : new PublicKey(parsed.accounts.mint.address),
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Convert parsed Token-2022 UpdateGroupMemberPointer instruction to RPC format
 */
function convertUpdateGroupMemberPointerInfo(parsed: any): UpdateGroupMemberPointerInfo {
    const memberAddress = unwrapOption(parsed.data.memberAddress);

    return {
        authority: new PublicKey(parsed.accounts.groupMemberPointerAuthority.address),
        memberAddress: memberAddress ? new PublicKey(memberAddress) : null,
        mint: new PublicKey(parsed.accounts.mint.address),
    };
}

/**
 * Convert parsed Token-2022 InitializeTokenGroup instruction to RPC format
 */
function convertInitializeTokenGroupInfo(parsed: any): InitializeTokenGroupInfo {
    const updateAuthority = unwrapOption(parsed.data.updateAuthority);

    return {
        group: new PublicKey(parsed.accounts.group.address),
        maxSize: safeNumber(parsed.data.maxSize),
        mint: new PublicKey(parsed.accounts.mint.address),
        mintAuthority: new PublicKey(parsed.accounts.mintAuthority.address),
        updateAuthority: updateAuthority
            ? new PublicKey(updateAuthority)
            : new PublicKey(parsed.accounts.mintAuthority.address),
    };
}

/**
 * Convert parsed Token-2022 UpdateTokenGroupMaxSize instruction to RPC format
 */
function convertUpdateTokenGroupMaxSizeInfo(parsed: any): UpdateTokenGroupMaxSizeInfo {
    return {
        group: new PublicKey(parsed.accounts.group.address),
        maxSize: safeNumber(parsed.data.maxSize),
        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
    };
}

/**
 * Convert parsed Token-2022 UpdateTokenGroupUpdateAuthority instruction to RPC format
 */
function convertUpdateTokenGroupUpdateAuthorityInfo(parsed: any): UpdateTokenGroupUpdateAuthorityInfo {
    const newUpdateAuthority = unwrapOption(parsed.data.newUpdateAuthority);

    return {
        group: new PublicKey(parsed.accounts.group.address),
        newUpdateAuthority: newUpdateAuthority
            ? new PublicKey(newUpdateAuthority)
            : new PublicKey(parsed.accounts.group.address),
        updateAuthority: new PublicKey(parsed.accounts.updateAuthority.address),
    };
}

/**
 * Convert parsed Token-2022 InitializeTokenGroupMember instruction to RPC format
 */
function convertInitializeTokenGroupMemberInfo(parsed: any): InitializeTokenGroupMemberInfo {
    return {
        group: new PublicKey(parsed.accounts.group.address),
        groupUpdateAuthority: new PublicKey(parsed.accounts.groupUpdateAuthority.address),
        member: new PublicKey(parsed.accounts.member.address),
        memberMint: new PublicKey(parsed.accounts.memberMint.address),
        memberMintAuthority: new PublicKey(parsed.accounts.memberMintAuthority.address),
    };
}

/**
 * Parse Token-2022 instruction data in @solana-program format and return parsed data in RPC format
 */
export function parseToken2022InstructionData(idata: TInstruction): { type: string; info: any } | null {
    let instructionType: Token2022Instruction;
    try {
        instructionType = identifyToken2022Instruction(idata);
    } catch {
        return null;
    }

    try {
        switch (instructionType) {
            case Token2022Instruction.InitializeMint: {
                const parsed = parseInitializeMintInstruction(idata);
                return { info: convertInitializeMintInfo(parsed), type: 'initializeMint' };
            }
            case Token2022Instruction.InitializeMetadataPointer: {
                const parsed = parseInitializeMetadataPointerInstruction(idata);
                return { info: convertInitializeMetadataPointerInfo(parsed), type: 'initializeMetadataPointer' };
            }
            case Token2022Instruction.UpdateMetadataPointer: {
                const parsed = parseUpdateMetadataPointerInstruction(idata);
                return { info: convertUpdateMetadataPointerInfo(parsed), type: 'updateMetadataPointer' };
            }
            case Token2022Instruction.InitializeGroupPointer: {
                const parsed = parseInitializeGroupPointerInstruction(idata);
                return { info: convertInitializeGroupPointerInfo(parsed), type: 'initializeGroupPointer' };
            }
            case Token2022Instruction.UpdateGroupPointer: {
                const parsed = parseUpdateGroupPointerInstruction(idata);
                return { info: convertUpdateGroupPointerInfo(parsed), type: 'updateGroupPointer' };
            }
            case Token2022Instruction.InitializeGroupMemberPointer: {
                const parsed = parseInitializeGroupMemberPointerInstruction(idata);
                return { info: convertInitializeGroupMemberPointerInfo(parsed), type: 'initializeGroupMemberPointer' };
            }
            case Token2022Instruction.UpdateGroupMemberPointer: {
                const parsed = parseUpdateGroupMemberPointerInstruction(idata);
                return { info: convertUpdateGroupMemberPointerInfo(parsed), type: 'updateGroupMemberPointer' };
            }
            case Token2022Instruction.InitializeTokenMetadata: {
                // Use custom parser due to bug in library's decoder (getBytesDecoder without fixed size)
                const parsed = parseInitializeTokenMetadataInstructionCustom(idata);
                return { info: convertInitializeTokenMetadataInfo(parsed), type: 'initializeTokenMetadata' };
            }
            case Token2022Instruction.UpdateTokenMetadataField: {
                const parsed = parseUpdateTokenMetadataFieldInstruction(idata);
                return { info: convertUpdateTokenMetadataFieldInfo(parsed), type: 'updateTokenMetadataField' };
            }
            case Token2022Instruction.RemoveTokenMetadataKey: {
                const parsed = parseRemoveTokenMetadataKeyInstruction(idata);
                return { info: convertRemoveTokenMetadataKeyInfo(parsed), type: 'removeTokenMetadataKey' };
            }
            case Token2022Instruction.UpdateTokenMetadataUpdateAuthority: {
                // Use custom parser due to bug in library's decoder (getBytesDecoder without fixed size)
                const parsed = parseUpdateTokenMetadataUpdateAuthorityInstructionCustom(idata);
                return {
                    info: convertUpdateTokenMetadataUpdateAuthorityInfo(parsed),
                    type: 'updateTokenMetadataUpdateAuthority',
                };
            }
            case Token2022Instruction.EmitTokenMetadata: {
                const parsed = parseEmitTokenMetadataInstruction(idata);
                return { info: convertEmitTokenMetadataInfo(parsed), type: 'emitTokenMetadata' };
            }
            case Token2022Instruction.InitializeTokenGroup: {
                const parsed = parseInitializeTokenGroupInstruction(idata);
                return { info: convertInitializeTokenGroupInfo(parsed), type: 'initializeTokenGroup' };
            }
            case Token2022Instruction.UpdateTokenGroupMaxSize: {
                const parsed = parseUpdateTokenGroupMaxSizeInstruction(idata);
                return { info: convertUpdateTokenGroupMaxSizeInfo(parsed), type: 'updateTokenGroupMaxSize' };
            }
            case Token2022Instruction.UpdateTokenGroupUpdateAuthority: {
                const parsed = parseUpdateTokenGroupUpdateAuthorityInstruction(idata);
                return {
                    info: convertUpdateTokenGroupUpdateAuthorityInfo(parsed),
                    type: 'updateTokenGroupUpdateAuthority',
                };
            }
            case Token2022Instruction.InitializeTokenGroupMember: {
                const parsed = parseInitializeTokenGroupMemberInstruction(idata);
                return { info: convertInitializeTokenGroupMemberInfo(parsed), type: 'initializeTokenGroupMember' };
            }
            default:
                return null;
        }
    } catch {
        return null;
    }
}

/**
 * Parse Token-2022 instruction and return parsed data in RPC format
 */
export function parseToken2022Instruction(instruction: TransactionInstruction): { type: string; info: any } | null {
    const idata = intoInstructionData(instruction);
    return parseToken2022InstructionData(idata);
}
