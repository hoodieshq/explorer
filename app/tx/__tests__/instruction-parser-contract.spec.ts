import { TransferInfo } from '@components/instruction/system/types';
import { TransferChecked } from '@components/instruction/token/types';
import { createInstructionParserDispatcher, isParsedInstruction } from '@entities/instruction-parser';
import { systemInstructionParser } from '@features/decode-instruction-system';
import { tokenInstructionParser } from '@features/decode-instruction-token';
import { Keypair, type ParsedInstruction, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { create } from 'superstruct';
import { describe, expect, test } from 'vitest';

/**
 * Contract test: both pipelines (inspector via `fromTransactionInstruction`
 * and tx-page via `fromParsedInstruction`) must produce `parsed.info` payloads
 * that satisfy the same superstruct validator AND yield equivalent values.
 *
 * Parity is asserted per program *where both paths produce the same shape*:
 * - System Transfer and SPL Token TransferChecked are covered below — the byte
 *   path normalises into the same RPC-info shape the validator expects.
 *
 * Not all slices admit a symmetric parity assertion, and that is by design (see
 * the "known divergences" caveat in the capability spec):
 * - **Token-2022**: its byte path decodes only the metadata/pointer/group
 *   extensions (kit-shaped output); its RPC path covers the standard token ops.
 *   The two paths cover different instruction sets, so there is no single
 *   logical instruction to compare field-for-field.
 * - **Associated Token**: the byte path returns `@solana-program/token`
 *   kit-shaped objects while the RPC path passes RPC `info` through; the shapes
 *   differ structurally, so equality is asserted at the card level, not here.
 * - **MPL Token Metadata**: the RPC never pre-parses it (no `fromParsed`), so
 *   there is no RPC path to compare against.
 */
describe('instruction-parser contract', () => {
    test('should produce equivalent info for byte-parsed and RPC-parsed System Transfer paths', () => {
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

    test('should produce equivalent info for byte-parsed and RPC-parsed SPL Token TransferChecked paths', () => {
        const dispatcher = createInstructionParserDispatcher([tokenInstructionParser]);

        const source = Keypair.generate().publicKey;
        const mint = Keypair.generate().publicKey;
        const destination = Keypair.generate().publicKey;
        const authority = Keypair.generate().publicKey;
        const amount = 1_000n;
        const decimals = 6;
        const tokenProgramId = new PublicKey(TOKEN_PROGRAM_ADDRESS);

        // TransferChecked wire layout: [discriminator=12, amount u64 LE, decimals u8].
        const data = Buffer.alloc(10);
        data.writeUInt8(12, 0);
        data.writeBigUInt64LE(amount, 1);
        data.writeUInt8(decimals, 9);
        const rawIx = new TransactionInstruction({
            data,
            keys: [
                { isSigner: false, isWritable: true, pubkey: source },
                { isSigner: false, isWritable: false, pubkey: mint },
                { isSigner: false, isWritable: true, pubkey: destination },
                { isSigner: true, isWritable: false, pubkey: authority },
            ],
            programId: tokenProgramId,
        });

        // Byte-parsed path (Inspector): raw TransactionInstruction -> ParsedInstruction
        const byteParsed = dispatcher.fromTransactionInstruction(rawIx);

        // RPC-pre-parsed path (tx page): RPC's transferChecked shape -> dispatcher.
        const rpcInput: ParsedInstruction = {
            parsed: {
                info: {
                    authority: authority.toBase58(),
                    destination: destination.toBase58(),
                    mint: mint.toBase58(),
                    source: source.toBase58(),
                    tokenAmount: { amount: amount.toString(), decimals, uiAmountString: '0.001' },
                },
                type: 'transferChecked',
            },
            program: 'spl-token',
            programId: tokenProgramId,
        };
        const rpcParsed = dispatcher.fromParsedInstruction(rpcInput);

        if (!isParsedInstruction(byteParsed)) {
            throw new Error('byte-parsed SPL Token TransferChecked should be recognised');
        }

        expect(byteParsed.program).toBe('spl-token');
        expect(rpcParsed.program).toBe('spl-token');
        expect(byteParsed.parsed.type).toBe('transferChecked');
        expect(rpcParsed.parsed.type).toBe('transferChecked');

        const byteInfo = create(byteParsed.parsed.info, TransferChecked);
        const rpcInfo = create(rpcParsed.parsed.info, TransferChecked);

        // The load-bearing fields agree across both paths. (uiAmountString is a
        // display-formatting field whose RPC spelling may differ; not asserted.)
        if (!byteInfo.authority || !rpcInfo.authority) throw new Error('TransferChecked authority must be present');
        expect(byteInfo.source.equals(rpcInfo.source)).toBe(true);
        expect(byteInfo.destination.equals(rpcInfo.destination)).toBe(true);
        expect(byteInfo.mint.equals(rpcInfo.mint)).toBe(true);
        expect(byteInfo.authority.equals(rpcInfo.authority)).toBe(true);
        expect(byteInfo.tokenAmount.amount).toBe(rpcInfo.tokenAmount.amount);
        expect(byteInfo.tokenAmount.decimals).toBe(rpcInfo.tokenAmount.decimals);

        expect(byteInfo.tokenAmount.amount).toBe(amount.toString());
        expect(byteInfo.tokenAmount.decimals).toBe(decimals);
        expect(byteInfo.source.equals(source)).toBe(true);
        expect(byteInfo.authority.equals(authority)).toBe(true);
    });

    test('should pass through unchanged when no slice is registered', () => {
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

    test('should fall back to RPC value when slice rejects the type', () => {
        const dispatcher = createInstructionParserDispatcher([systemInstructionParser]);
        const rpcInput: ParsedInstruction = {
            parsed: { info: {}, type: 'someUnknownSystemInstructionType' },
            program: 'system',
            programId: SystemProgram.programId,
        };

        const result = dispatcher.fromParsedInstruction(rpcInput);
        expect(result).toBe(rpcInput);
    });

    test('should return undefined for fromTransactionInstruction when no parser registered', () => {
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

    test('should return UnparsedInstruction when parser exists but decode fails', () => {
        const dispatcher = createInstructionParserDispatcher([systemInstructionParser]);
        const ix = new TransactionInstruction({
            // Invalid System instruction data — slice's fromTransaction returns undefined.
            data: Buffer.from([255, 255, 255, 255]),
            keys: [],
            programId: SystemProgram.programId,
        });

        const result = dispatcher.fromTransactionInstruction(ix);
        if (isParsedInstruction(result) || !result) throw new Error('expected UnparsedInstruction');
        expect(result.unknown).toBe(true);
        expect(result.programLabel).toBe('system');
        expect(result.programId.equals(SystemProgram.programId)).toBe(true);
    });

    test('should throw on duplicate programId', () => {
        expect(() => createInstructionParserDispatcher([systemInstructionParser, systemInstructionParser])).toThrow(
            'duplicate parser',
        );
    });
});
