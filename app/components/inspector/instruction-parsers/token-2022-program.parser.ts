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
import {
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
 * Parse Token-2022 instruction and return parsed data in RPC format
 */
export function parseToken2022Instruction(instruction: TransactionInstruction): { type: string; info: any } | null {
    const idata = intoInstructionData(instruction);

    // Try parsing each instruction type - the parsers check discriminators themselves
    // Token-2022 uses Anchor-style discriminators (8-byte hash) for extension instructions

    try {
        const parsedIx = parseInitializeTokenMetadataInstruction(idata);
        return { info: convertInitializeTokenMetadataInfo(parsedIx), type: 'initializeTokenMetadata' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseUpdateTokenMetadataFieldInstruction(idata);
        return { info: convertUpdateTokenMetadataFieldInfo(parsedIx), type: 'updateTokenMetadataField' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseRemoveTokenMetadataKeyInstruction(idata);
        return { info: convertRemoveTokenMetadataKeyInfo(parsedIx), type: 'removeTokenMetadataKey' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseUpdateTokenMetadataUpdateAuthorityInstruction(idata);
        return {
            info: convertUpdateTokenMetadataUpdateAuthorityInfo(parsedIx),
            type: 'updateTokenMetadataUpdateAuthority',
        };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseEmitTokenMetadataInstruction(idata);
        return { info: convertEmitTokenMetadataInfo(parsedIx), type: 'emitTokenMetadata' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseInitializeMetadataPointerInstruction(idata);
        return { info: convertInitializeMetadataPointerInfo(parsedIx), type: 'initializeMetadataPointer' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseUpdateMetadataPointerInstruction(idata);
        return { info: convertUpdateMetadataPointerInfo(parsedIx), type: 'updateMetadataPointer' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseInitializeGroupPointerInstruction(idata);
        return { info: convertInitializeGroupPointerInfo(parsedIx), type: 'initializeGroupPointer' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseUpdateGroupPointerInstruction(idata);
        return { info: convertUpdateGroupPointerInfo(parsedIx), type: 'updateGroupPointer' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseInitializeGroupMemberPointerInstruction(idata);
        return { info: convertInitializeGroupMemberPointerInfo(parsedIx), type: 'initializeGroupMemberPointer' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseUpdateGroupMemberPointerInstruction(idata);
        return { info: convertUpdateGroupMemberPointerInfo(parsedIx), type: 'updateGroupMemberPointer' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseInitializeTokenGroupInstruction(idata);
        return { info: convertInitializeTokenGroupInfo(parsedIx), type: 'initializeTokenGroup' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseUpdateTokenGroupMaxSizeInstruction(idata);
        return { info: convertUpdateTokenGroupMaxSizeInfo(parsedIx), type: 'updateTokenGroupMaxSize' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseUpdateTokenGroupUpdateAuthorityInstruction(idata);
        return { info: convertUpdateTokenGroupUpdateAuthorityInfo(parsedIx), type: 'updateTokenGroupUpdateAuthority' };
    } catch {} // eslint-disable-line no-empty

    try {
        const parsedIx = parseInitializeTokenGroupMemberInstruction(idata);
        return { info: convertInitializeTokenGroupMemberInfo(parsedIx), type: 'initializeTokenGroupMember' };
    } catch {} // eslint-disable-line no-empty

    // Try basic SPL Token instructions (these use single-byte discriminators)
    try {
        const parsedIx = parseInitializeMintInstruction(idata);
        return { info: convertInitializeMintInfo(parsedIx), type: 'initializeMint' };
    } catch {} // eslint-disable-line no-empty

    return null;
}
