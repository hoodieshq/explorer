import { type HistoryEventBase, type TransactionResponse, walkInstructions } from '@entities/account-history';
import {
    addDecoderSizePrefix,
    type Address,
    getAddressDecoder,
    getBytesDecoder,
    getDiscriminatedUnionDecoder,
    getStructDecoder,
    getU8Decoder,
    getU32Decoder,
    getU64Decoder,
} from '@solana/kit';

import { type AnchorIdlEvent, InstructionType } from './types';

// IDL_IX_TAG = 0x0a69e9a778bcf440 (u64) from anchor-lang/src/idl.rs, written little-endian.
// Every Anchor IDL instruction's data starts with these 8 bytes; the program dispatcher
// uses them to distinguish IDL housekeeping from real program calls.
const IDL_IX_TAG = new Uint8Array([0x40, 0xf4, 0xbc, 0x78, 0xa7, 0xe9, 0x69, 0x0a]);

// Borsh-encoded IdlInstruction enum (anchor-lang/src/idl.rs):
//   0: Create { data_len: u64 }
//   1: CreateBuffer
//   2: Write { data: Vec<u8> }              // u32 length prefix + bytes
//   3: SetBuffer
//   4: SetAuthority { new_authority: Pubkey }
//   5: Close
//   6: Resize { data_len: u64 }
const idlInstructionDecoder = getDiscriminatedUnionDecoder(
    [
        ['Create', getStructDecoder([['dataLen', getU64Decoder()]])],
        ['CreateBuffer', getStructDecoder([])],
        ['Write', getStructDecoder([['data', addDecoderSizePrefix(getBytesDecoder(), getU32Decoder())]])],
        ['SetBuffer', getStructDecoder([])],
        ['SetAuthority', getStructDecoder([['newAuthority', getAddressDecoder()]])],
        ['Close', getStructDecoder([])],
        ['Resize', getStructDecoder([['dataLen', getU64Decoder()]])],
    ],
    { size: getU8Decoder() },
);

export function parseAnchorIdlTransaction(
    tx: TransactionResponse,
    base: HistoryEventBase,
    programAddress: Address,
): AnchorIdlEvent[] {
    const events: AnchorIdlEvent[] = [];
    for (const ix of walkInstructions(tx, programAddress)) {
        if (!hasIdlIxTag(ix.data)) continue;
        const event = decodeIdlInstruction(base, ix.data.subarray(8), ix.accounts);
        if (event) events.push(event);
    }
    return events;
}

function hasIdlIxTag(data: Uint8Array): boolean {
    if (data.length < 8) return false;
    for (let i = 0; i < 8; i++) {
        if (data[i] !== IDL_IX_TAG[i]) return false;
    }
    return true;
}

function decodeIdlInstruction(
    base: HistoryEventBase,
    payload: Uint8Array,
    accounts: readonly Address[],
): AnchorIdlEvent | undefined {
    let decoded;
    try {
        decoded = idlInstructionDecoder.decode(payload);
    } catch {
        // Truncated or malformed payload — skip this instruction.
        return undefined;
    }

    switch (decoded.__kind) {
        case 'Create':
            return { ...base, dataLen: Number(decoded.dataLen), instructionType: InstructionType.Create };
        case 'CreateBuffer':
            return { ...base, instructionType: InstructionType.CreateBuffer };
        case 'Write': {
            const rawData = new Uint8Array(decoded.data);
            return { ...base, dataLength: rawData.length, instructionType: InstructionType.Write, rawData };
        }
        case 'SetBuffer':
            // Per Anchor's IdlSetBuffer context: accounts = [buffer (writable), idl (writable),
            // authority (signer)] — accounts[0] is the foreign source account whose Writes we
            // need to replay to recover the bytes copied into the IDL account.
            return { ...base, bufferAccount: accounts[0], instructionType: InstructionType.SetBuffer };
        case 'SetAuthority':
            return { ...base, instructionType: InstructionType.SetAuthority, newAuthority: decoded.newAuthority };
        case 'Close':
            return { ...base, instructionType: InstructionType.Close };
        case 'Resize':
            return { ...base, dataLen: Number(decoded.dataLen), instructionType: InstructionType.Resize };
    }
}
