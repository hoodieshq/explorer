import {
    AccountRole,
    type Address,
    appendTransactionMessageInstruction,
    appendTransactionMessageInstructions,
    blockhash,
    type CompiledTransactionMessage,
    type CompiledTransactionMessageWithLifetime,
    compileTransactionMessage,
    createTransactionMessage,
    getBase58Decoder,
    getBase58Encoder,
    getBase64Decoder,
    getCompiledTransactionMessageEncoder,
    getTransactionEncoder,
    type Instruction,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    type SignatureBytes,
    type Transaction,
    TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
} from '@solana/kit';
import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget';

import { gen } from '../../__tests__/gen.js';
import { fromCompiledMessage } from '../parse-transaction.js';
import type { ParsedTransaction, RpcJsonParsedTransaction, RpcJsonTransaction, TransactionVersion } from '../types.js';

// kit brands `Blockhash`, so the seeded string is wrapped rather than passed raw - the same shape
// `app/entities/transaction-data/__fixtures__/wire-transactions.ts` uses.
const BLOCKHASH = { blockhash: blockhash(gen.blockhash(7)), lastValidBlockHeight: 100n } as const;
const FEE_PAYER = gen.address(1);
const PROGRAM_ADDRESS = gen.address(2);
export const INSTRUCTION_DATA = new Uint8Array([1, 2, 3]);
export const INSTRUCTION_DATA_BASE58 = 'Ldp';

type CompiledMessageFixture = CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;

function compiledMessageFor(version: TransactionVersion): CompiledMessageFixture {
    if (version === 'legacy') {
        return compileTransactionMessage(
            pipe(
                createTransactionMessage({ version: 'legacy' }),
                m => setTransactionMessageFeePayer(FEE_PAYER, m),
                m => setTransactionMessageLifetimeUsingBlockhash(BLOCKHASH, m),
                m =>
                    appendTransactionMessageInstruction({ data: INSTRUCTION_DATA, programAddress: PROGRAM_ADDRESS }, m),
            ),
        );
    }
    if (version === 0) {
        return compileTransactionMessage(
            pipe(
                createTransactionMessage({ version: 0 }),
                m => setTransactionMessageFeePayer(FEE_PAYER, m),
                m => setTransactionMessageLifetimeUsingBlockhash(BLOCKHASH, m),
                m =>
                    appendTransactionMessageInstruction({ data: INSTRUCTION_DATA, programAddress: PROGRAM_ADDRESS }, m),
            ),
        );
    }
    // Unlike legacy and v0 above, this instruction names an account, so a v1 fixture exercises the
    // account-resolution path an instruction with zero accounts never would.
    return compileTransactionMessage(
        pipe(
            createTransactionMessage({ version: 1 }),
            m => setTransactionMessageFeePayer(FEE_PAYER, m),
            m => setTransactionMessageLifetimeUsingBlockhash(BLOCKHASH, m),
            m =>
                appendTransactionMessageInstruction(
                    {
                        accounts: [{ address: FEE_PAYER, role: AccountRole.WRITABLE_SIGNER }],
                        data: INSTRUCTION_DATA,
                        programAddress: PROGRAM_ADDRESS,
                    },
                    m,
                ),
        ),
    );
}

const LOOKUP_TABLE_ADDRESS = gen.address(9);
const LOOKUP_TABLE_LOADED_ADDRESS = gen.address(10);

/** A v0 message with one address loaded from a lookup table, for a test that needs a real ALT entry. */
export function v0CompiledWithLookupTable(): {
    compiled: CompiledMessageFixture;
    loadedAddress: Address;
    lookupTableAddress: Address;
} {
    const compiled = compileTransactionMessage(
        pipe(
            createTransactionMessage({ version: 0 }),
            m => setTransactionMessageFeePayer(FEE_PAYER, m),
            m => setTransactionMessageLifetimeUsingBlockhash(BLOCKHASH, m),
            m =>
                appendTransactionMessageInstruction(
                    {
                        accounts: [
                            {
                                address: LOOKUP_TABLE_LOADED_ADDRESS,
                                addressIndex: 0,
                                lookupTableAddress: LOOKUP_TABLE_ADDRESS,
                                role: AccountRole.WRITABLE,
                            },
                        ],
                        data: INSTRUCTION_DATA,
                        programAddress: PROGRAM_ADDRESS,
                    },
                    m,
                ),
        ),
    );

    return { compiled, loadedAddress: LOOKUP_TABLE_LOADED_ADDRESS, lookupTableAddress: LOOKUP_TABLE_ADDRESS };
}

const SECOND_SIGNER = gen.address(20);

/** A legacy message with two required signers, for a wire-size test that exercises the per-signer multiplication. */
export function twoSignerLegacyTransaction(): { compiled: CompiledMessageFixture; messageBytes: Uint8Array } {
    const compiled = compileTransactionMessage(
        pipe(
            createTransactionMessage({ version: 'legacy' }),
            m => setTransactionMessageFeePayer(FEE_PAYER, m),
            m => setTransactionMessageLifetimeUsingBlockhash(BLOCKHASH, m),
            m =>
                appendTransactionMessageInstruction(
                    {
                        accounts: [{ address: SECOND_SIGNER, role: AccountRole.READONLY_SIGNER }],
                        data: INSTRUCTION_DATA,
                        programAddress: PROGRAM_ADDRESS,
                    },
                    m,
                ),
        ),
    );

    return { compiled, messageBytes: encode(compiled) };
}

/** A legacy message with a header override. */
export function legacyTransactionWithHeader(header: Partial<CompiledMessageFixture['header']>): {
    compiled: CompiledMessageFixture;
    messageBytes: Uint8Array;
} {
    const base = compiledMessageFor('legacy');
    const compiled = { ...base, header: { ...base.header, ...header } };

    return {
        compiled,
        get messageBytes() {
            return encode(compiled);
        },
    };
}

function encode(compiled: CompiledTransactionMessage): Uint8Array {
    return new Uint8Array(getCompiledTransactionMessageEncoder().encode(compiled));
}

export const legacyTransaction = Object.assign(() => fromCompiledMessage(compiledMessageFor('legacy')), {
    compiled: () => compiledMessageFor('legacy'),
    messageBytes: () => encode(compiledMessageFor('legacy')),
});

export const v0Transaction = Object.assign(() => fromCompiledMessage(compiledMessageFor(0)), {
    compiled: () => compiledMessageFor(0),
    messageBytes: () => encode(compiledMessageFor(0)),
});

export const v1Transaction = Object.assign(() => fromCompiledMessage(compiledMessageFor(1)), {
    compiled: () => compiledMessageFor(1),
    messageBytes: () => encode(compiledMessageFor(1)),
});

/** Overrides a compiled v1 message's config, so a spec can express a mask the encoder would refuse to produce. */
export function v1CompiledWithConfig(overrides: {
    configMask: number;
    configValues: Extract<CompiledTransactionMessage, { version: 1 }>['configValues'];
}): CompiledMessageFixture {
    return { ...compiledMessageFor(1), ...overrides };
}

/** `undefined` produces a v1 message with no config at all, for the absent-limit fallback case. */
export function v1TransactionWithConfig(overrides: { computeUnitLimit: number } | undefined): ParsedTransaction {
    if (!overrides) return fromCompiledMessage(v1CompiledWithConfig({ configMask: 0, configValues: [] }));

    return fromCompiledMessage(
        v1CompiledWithConfig({
            configMask: TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
            configValues: [{ kind: 'u32', value: overrides.computeUnitLimit }],
        }),
    );
}

/** A transaction built from bare instructions, for tests that need specific programs and ordering. */
export function transactionWithInstructions(
    version: TransactionVersion,
    instructions: readonly Instruction[],
): ParsedTransaction {
    const message = pipe(
        createTransactionMessage({ version }),
        m => setTransactionMessageFeePayer(FEE_PAYER, m),
        m => setTransactionMessageLifetimeUsingBlockhash(BLOCKHASH, m),
        m => appendTransactionMessageInstructions(instructions, m),
    );

    return fromCompiledMessage(compileTransactionMessage(message));
}

/** A v1 message declaring a limit and carrying instructions, for tests that set the two against each other. */
export function v1TransactionWithLimitAndInstructions(
    computeUnitLimit: number,
    instructions: readonly Instruction[],
): ParsedTransaction {
    const compiled = compileTransactionMessage(
        pipe(
            createTransactionMessage({ version: 1 }),
            m => setTransactionMessageFeePayer(FEE_PAYER, m),
            m => setTransactionMessageLifetimeUsingBlockhash(BLOCKHASH, m),
            m => appendTransactionMessageInstructions(instructions, m),
        ),
    );

    return fromCompiledMessage({
        ...compiled,
        configMask: TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
        configValues: [{ kind: 'u32', value: computeUnitLimit }],
    });
}

export function setComputeUnitLimit(units: number): Instruction {
    return getSetComputeUnitLimitInstruction({ units });
}

/** System program instruction, reserved at 3k under the built-in-programs schedule. */
export function transfer(): Instruction {
    return { data: INSTRUCTION_DATA, programAddress: gen.systemProgram };
}

/** A program outside the built-in-programs list, reserved at the 200k default. */
export function bpfInstruction(): Instruction {
    return { data: INSTRUCTION_DATA, programAddress: gen.address(30) };
}

export function jsonResponse(version: TransactionVersion = 1): {
    transaction: RpcJsonTransaction;
    version: TransactionVersion;
} {
    const compiled = compiledMessageFor(version);
    const [feePayer, program] = compiled.staticAccounts;

    return {
        transaction: {
            message: {
                accountKeys: [feePayer, program],
                header: {
                    numReadonlySignedAccounts: compiled.header.numReadonlySignerAccounts,
                    numReadonlyUnsignedAccounts: compiled.header.numReadonlyNonSignerAccounts,
                    numRequiredSignatures: compiled.header.numSignerAccounts,
                },
                instructions: [{ accounts: [0], data: INSTRUCTION_DATA_BASE58, programIdIndex: 1 }],
                recentBlockhash: compiled.lifetimeToken,
            },
            signatures: [gen.signature(1)],
        },
        version,
    };
}

/** An `encoding: 'jsonParsed'` response, built from the same compiled message the wire fixtures use. */
export function jsonParsedResponse(version: TransactionVersion = 1): {
    transaction: RpcJsonParsedTransaction;
    version: TransactionVersion;
} {
    const compiled = compiledMessageFor(version);
    const [feePayer, program] = compiled.staticAccounts;

    return {
        transaction: {
            message: {
                accountKeys: [
                    { pubkey: feePayer, signer: true, source: 'transaction' as const, writable: true },
                    { pubkey: program, signer: false, source: 'transaction' as const, writable: false },
                ],
                instructions: [{ accounts: [], data: INSTRUCTION_DATA_BASE58, programId: program }],
                recentBlockhash: compiled.lifetimeToken,
            },
            signatures: [gen.signature(1)],
        },
        version,
    };
}

/** What the RPC serves under `base64` and `base58`: the full wire transaction, message plus signatures. */
export function wireResponse(version: TransactionVersion = 1, encoding: 'base58' | 'base64' = 'base64') {
    const signatures = { [FEE_PAYER]: getBase58Encoder().encode(gen.signature(1)) as SignatureBytes };

    return toWireResponse(version, signatures, encoding);
}

/** The same transaction with no signature filled in, which the wire carries as 64 zero bytes. */
export function unsignedWireResponse(version: TransactionVersion = 1) {
    // eslint-disable-next-line unicorn/no-null -- kit encodes a null signature as an empty slot
    return toWireResponse(version, { [FEE_PAYER]: null }, 'base64');
}

function toWireResponse(
    version: TransactionVersion,
    signatures: Transaction['signatures'],
    encoding: 'base58' | 'base64',
) {
    const messageBytes = encode(compiledMessageFor(version)) as unknown as Transaction['messageBytes'];
    const wireBytes = new Uint8Array(getTransactionEncoder().encode({ messageBytes, signatures }));
    const decoder = encoding === 'base64' ? getBase64Decoder() : getBase58Decoder();

    return { transaction: [decoder.decode(wireBytes), encoding] as const, version };
}
