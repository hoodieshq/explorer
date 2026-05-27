import { TransferInfo } from '@components/instruction/system/types';
import { systemInstructionParser } from '@features/instruction-system';
import { Keypair, type ParsedInstruction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { create } from 'superstruct';
import { describe, expect, test } from 'vitest';

import { createInstructionParserDispatcher } from '../model/dispatcher';
import { isParsedInstruction } from '../model/types';

/**
 * Contract test: both pipelines (inspector via `fromTransactionInstruction`
 * and tx-page via `fromParsedInstruction`) must produce `parsed.info` payloads
 * that satisfy the same superstruct validator AND yield equivalent values.
 * System Transfer is the smallest probe — extend this suite with one
 * assertion per migrated program as new slices land.
 */
describe('instruction-parser contract', () => {
    test('System Transfer: byte-parsed and RPC-parsed paths produce equivalent info', () => {
        const dispatcher = createInstructionParserDispatcher([systemInstructionParser]);

        const source = Keypair.generate().publicKey;
        const destination = Keypair.generate().publicKey;
        const lamports = 1_500_000;

        const rawIx = SystemProgram.transfer({ fromPubkey: source, lamports, toPubkey: destination });

        // Byte-parsed path (Inspector): raw TransactionInstruction -> ParsedInstruction
        const byteParsed = dispatcher.fromTransactionInstruction(rawIx);

        // RPC-pre-parsed path (tx page): RPC's output -> dispatcher.fromParsedInstruction
        // -> slice's fromParsed -> wrapped back to ParsedInstruction.
        const rpcInput: ParsedInstruction = {
            parsed: {
                info: {
                    destination: destination.toBase58(),
                    lamports,
                    source: source.toBase58(),
                },
                type: 'transfer',
            },
            program: 'system',
            programId: SystemProgram.programId,
        };
        const rpcParsed = dispatcher.fromParsedInstruction(rpcInput);

        if (!isParsedInstruction(byteParsed)) {
            throw new Error('byte-parsed System Transfer should be recognised');
        }

        // Both paths produce identical program + type identification.
        expect(byteParsed.program).toBe('system');
        expect(rpcParsed.program).toBe('system');
        expect(byteParsed.programId.equals(SystemProgram.programId)).toBe(true);
        expect(rpcParsed.programId.equals(SystemProgram.programId)).toBe(true);
        expect(byteParsed.parsed.type).toBe('transfer');
        expect(rpcParsed.parsed.type).toBe('transfer');

        // Both info payloads satisfy the TransferInfo superstruct validator
        // and produce equivalent PublicKey / lamport values.
        const byteInfo = create(byteParsed.parsed.info, TransferInfo);
        const rpcInfo = create(rpcParsed.parsed.info, TransferInfo);

        expect(byteInfo.lamports).toBe(rpcInfo.lamports);
        expect(byteInfo.source.equals(rpcInfo.source)).toBe(true);
        expect(byteInfo.destination.equals(rpcInfo.destination)).toBe(true);

        expect(byteInfo.lamports).toBe(lamports);
        expect(byteInfo.source.equals(source)).toBe(true);
        expect(byteInfo.destination.equals(destination)).toBe(true);
    });

    test('fromParsedInstruction passes through unchanged when no slice is registered', () => {
        const dispatcher = createInstructionParserDispatcher([]);
        const unknownProgram = Keypair.generate().publicKey;
        const rpcInput: ParsedInstruction = {
            parsed: { info: { foo: 'bar' }, type: 'unknown' },
            program: 'unknown-program',
            programId: unknownProgram,
        };

        const result = dispatcher.fromParsedInstruction(rpcInput);
        // Same reference: dispatcher returned the input untouched.
        expect(result).toBe(rpcInput);
    });

    test('fromParsedInstruction falls back to RPC value when slice rejects the type', () => {
        const dispatcher = createInstructionParserDispatcher([systemInstructionParser]);
        const rpcInput: ParsedInstruction = {
            parsed: { info: {}, type: 'someUnknownSystemInstructionType' },
            program: 'system',
            programId: SystemProgram.programId,
        };

        const result = dispatcher.fromParsedInstruction(rpcInput);
        expect(result).toBe(rpcInput);
    });

    test('dispatcher returns undefined for fromTransactionInstruction when no parser registered', () => {
        const dispatcher = createInstructionParserDispatcher([]);
        const unknownProgram = Keypair.generate().publicKey;
        const ix = new TransactionInstruction({
            data: Buffer.from([1, 2, 3]),
            keys: [],
            programId: unknownProgram,
        });

        const result = dispatcher.fromTransactionInstruction(ix);
        expect(result).toBeUndefined();
    });

    test('dispatcher returns DispatchUnknown when parser exists but decode fails', () => {
        const dispatcher = createInstructionParserDispatcher([systemInstructionParser]);
        const ix = new TransactionInstruction({
            // Invalid System instruction data — slice's fromTransaction returns undefined.
            data: Buffer.from([255, 255, 255, 255]),
            keys: [],
            programId: SystemProgram.programId,
        });

        const result = dispatcher.fromTransactionInstruction(ix);
        if (isParsedInstruction(result) || !result) throw new Error('expected DispatchUnknown');
        expect(result.unknown).toBe(true);
        expect(result.programLabel).toBe('system');
        expect(result.programId.equals(SystemProgram.programId)).toBe(true);
    });

    test('createInstructionParserDispatcher throws on duplicate programId', () => {
        expect(() => createInstructionParserDispatcher([systemInstructionParser, systemInstructionParser])).toThrow(
            'duplicate parser',
        );
    });
});
