import {
    address,
    type Address,
    bytesEqual,
    type CompiledTransactionMessage,
    type CompiledTransactionMessageWithLifetime,
    getBase58Decoder,
    getBase58Encoder,
    getBase64Encoder,
    getCompiledTransactionMessageDecoder,
    getCompiledTransactionMessageEncoder,
    getInstructionsFromCompiledTransactionMessage,
    getTransactionDecoder,
    type ResolvedInstruction,
    type Transaction,
} from '@solana/kit';

import { type AccountResolutionResult, resolveAccounts } from './accounts.js';
import { fromRpcTransactionConfig, readTransactionConfig } from './config.js';
import type {
    AddressTableLookup,
    FromMessageOptions,
    ParsedTransaction,
    ReportedTransactionVersion,
    RpcJsonParsedTransaction,
    RpcJsonTransaction,
    RpcTransactionResponse,
    TransactionAccount,
    TransactionInstruction,
    TransactionVersion,
} from './types.js';
import { UnsupportedTransactionVersionError } from './version.js';

const BASE58_DECODER = getBase58Decoder();
const BASE58_ENCODER = getBase58Encoder();
const BASE64_ENCODER = getBase64Encoder();

export function fromCompiledMessage(
    message: CompiledTransactionMessage & CompiledTransactionMessageWithLifetime,
    options: FromMessageOptions = {},
): ParsedTransaction {
    validateHeaderIntegrity(
        {
            numReadonlySignedAccounts: message.header.numReadonlySignerAccounts,
            numReadonlyUnsignedAccounts: message.header.numReadonlyNonSignerAccounts,
            numRequiredSignatures: message.header.numSignerAccounts,
        },
        message.staticAccounts.length,
    );

    const loadedAddresses = groupLoadedAddresses(options.loadedAddresses);
    const lookups = message.version === 0 ? toCompiledAddressTableLookups(message.addressTableLookups) : [];
    const resolved = resolveAccounts({
        addressTableLookups: message.version === 0 ? lookups : undefined,
        header: message.header,
        loadedAddresses,
        staticKeys: message.staticAccounts,
        version: message.version,
    });

    // kit account metas omit source and lookup-table details. Map by address to recovered account metadata.
    const byAddress = new Map(resolved.accounts.map(account => [account.address, account] as const));

    // kit normalizes legacy/v0/v1 instructions to one shape and resolves indices against this account list.
    const instructions = getInstructionsFromCompiledTransactionMessage(message, loadedAddresses).map(ix =>
        toTransactionInstruction(ix, byAddress),
    );

    return buildTransaction({
        config: readTransactionConfig(message),
        instructions,
        lifetimeToken: message.lifetimeToken,
        lookups,
        resolved,
        signatures: options.signatures ?? [],
        version: message.version,
    });
}

export function fromMessageBytes(bytes: Uint8Array, options: FromMessageOptions = {}): ParsedTransaction {
    const compiled = getCompiledTransactionMessageDecoder().decode(bytes);

    // The message decoder ignores trailing bytes. A round trip detects full wire transactions.
    if (!bytesEqual(getCompiledTransactionMessageEncoder().encode(compiled), bytes)) {
        throw new Error('Transaction message bytes are not a canonical compiled message');
    }

    return fromCompiledMessage(compiled, options);
}

export function fromRpcTransaction(response: RpcTransactionResponse): ParsedTransaction {
    const loadedAddresses = response.meta?.loadedAddresses;
    const { transaction } = response;

    // Property-based narrowing excludes the wire tuple in the else branch.
    if ('message' in transaction) {
        const version = normalizeVersion(response.version);
        return isRpcJsonTransaction(transaction)
            ? fromJsonTransaction(transaction, version, loadedAddresses)
            : fromJsonParsedTransaction(transaction, version);
    }

    const [data, encoding] = transaction;
    // base64/base58 carry a full wire transaction, not a bare message.
    const wireBytes = new Uint8Array((encoding === 'base64' ? BASE64_ENCODER : BASE58_ENCODER).encode(data));
    const decoded = getTransactionDecoder().decode(wireBytes);
    // Copy message bytes so the parsed message does not retain a view into the response buffer.
    const compiled = getCompiledTransactionMessageDecoder().decode(new Uint8Array(decoded.messageBytes));

    return fromCompiledMessage(compiled, { loadedAddresses, signatures: toBase58Signatures(decoded.signatures) });
}

/**
 * The wire signatures in signer order.
 *
 * kit reports an unsigned signer slot as null. This parser stores it as undefined.
 */
function toBase58Signatures(signatures: Transaction['signatures']): (string | undefined)[] {
    return Object.values(signatures).map(signature => (signature ? BASE58_DECODER.decode(signature) : undefined));
}

/**
 * Empty for legacy and v1.
 * Also empty for v0 when the encoding does not name lookup tables, for example jsonParsed.
 */
export function getAddressTableLookups(transaction: ParsedTransaction): readonly AddressTableLookup[] {
    return transaction.version === 0 ? (transaction.addressTableLookups ?? []) : [];
}

/**
 * RPC reports version outside the message.
 * kit can surface it as bigint because version is not on its integer allow list.
 */
function normalizeVersion(version: ReportedTransactionVersion | bigint | undefined): TransactionVersion {
    const value = typeof version === 'bigint' ? Number(version) : version;
    if (value === 'legacy' || value === 0 || value === 1) return value;
    throw new UnsupportedTransactionVersionError(value);
}

function isRpcJsonTransaction(
    transaction: RpcJsonTransaction | RpcJsonParsedTransaction,
): transaction is RpcJsonTransaction {
    return 'header' in transaction.message;
}

function groupLoadedAddresses(
    loadedAddresses: FromMessageOptions['loadedAddresses'],
): { readonly: Address[]; writable: Address[] } | undefined {
    if (!loadedAddresses) return undefined;

    return {
        readonly: loadedAddresses.readonly.map(key => address(key)),
        writable: loadedAddresses.writable.map(key => address(key)),
    };
}

/**
 * This is a field rename only:
 * - kit uses lookupTableAddress.
 * - RPC and this package use accountKey.
 */
function toCompiledAddressTableLookups(
    lookups:
        | readonly {
              lookupTableAddress: Address;
              readonlyIndexes: readonly number[];
              writableIndexes: readonly number[];
          }[]
        | undefined,
): AddressTableLookup[] {
    return (lookups ?? []).map(({ lookupTableAddress, readonlyIndexes, writableIndexes }) => ({
        accountKey: lookupTableAddress,
        readonlyIndexes,
        writableIndexes,
    }));
}

/** `undefined` stays `undefined`, so a response that never reported the tables is not read as listing none. */
function toRpcAddressTableLookups(
    lookups: RpcJsonTransaction['message']['addressTableLookups'],
): AddressTableLookup[] | undefined {
    return lookups?.map(lookup => ({ ...lookup, accountKey: address(lookup.accountKey) }));
}

/**
 * Maps one of kit's `ResolvedInstruction`s onto the union's shape.
 *
 * kit account metas only carry address and role bits.
 * Resolve each account from the richer list that includes source metadata.
 */
function toTransactionInstruction(
    ix: ResolvedInstruction,
    byAddress: ReadonlyMap<Address, TransactionAccount>,
): TransactionInstruction {
    return {
        accounts: (ix.accounts ?? []).map(meta => ensureAccountExists(byAddress, meta.address)),
        programAddress: ix.programAddress,
        ...(ix.data !== undefined && { data: new Uint8Array(ix.data) }),
    };
}

/** Missing account means instruction resolution disagrees with account resolution. */
function ensureAccountExists(byAddress: ReadonlyMap<Address, TransactionAccount>, key: Address): TransactionAccount {
    const account = byAddress.get(key);
    if (!account) throw new Error(`Account address not in the resolved account list: ${key}`);
    return account;
}

/**
 * Mirror entity-inspector validation and keep RPC header field names for stable error messages.
 */
function validateHeaderIntegrity(header: RpcJsonTransaction['message']['header'], staticKeyCount: number): void {
    const { numReadonlySignedAccounts, numReadonlyUnsignedAccounts, numRequiredSignatures } = header;

    if (numRequiredSignatures <= 0 || numRequiredSignatures > staticKeyCount) {
        throw new Error(
            `numRequiredSignatures (${numRequiredSignatures}) out of range for ${staticKeyCount} account keys.`,
        );
    }

    if (numReadonlySignedAccounts < 0 || numReadonlyUnsignedAccounts < 0) {
        throw new Error(
            `negative readonly account count (signed=${numReadonlySignedAccounts}, ` +
                `unsigned=${numReadonlyUnsignedAccounts}).`,
        );
    }

    if (
        numReadonlySignedAccounts >= numRequiredSignatures ||
        numReadonlyUnsignedAccounts > staticKeyCount - numRequiredSignatures
    ) {
        throw new Error(
            `readonly counts (signed=${numReadonlySignedAccounts}, unsigned=${numReadonlyUnsignedAccounts}) ` +
                `exceed available accounts (signers=${numRequiredSignatures}, total=${staticKeyCount}).`,
        );
    }
}

function validateInstructionIndices(
    instructions: RpcJsonTransaction['message']['instructions'],
    accountKeyCount: number,
): void {
    for (const ix of instructions) {
        if (
            ix.programIdIndex < 0 ||
            ix.programIdIndex >= accountKeyCount ||
            ix.accounts.some(index => index < 0 || index >= accountKeyCount)
        ) {
            throw new Error(
                `instruction index out of bounds (programIdIndex=${ix.programIdIndex}, ` +
                    `accounts=[${ix.accounts.join(',')}], accountKeyCount=${accountKeyCount}).`,
            );
        }
    }
}

/**
 * Normalize JSON header naming and validate early.
 * Fail at the parse boundary before account or instruction resolution.
 */
function fromJsonTransaction(
    transaction: RpcJsonTransaction,
    version: TransactionVersion,
    loadedAddresses: FromMessageOptions['loadedAddresses'],
): ParsedTransaction {
    const { message } = transaction;
    const { accountKeys, header } = message;

    validateHeaderIntegrity(header, accountKeys.length);

    const resolvedHeader = {
        numReadonlyNonSignerAccounts: header.numReadonlyUnsignedAccounts,
        numReadonlySignerAccounts: header.numReadonlySignedAccounts,
        numSignerAccounts: header.numRequiredSignatures,
    };
    const lookups = version === 0 ? toRpcAddressTableLookups(message.addressTableLookups) : [];
    const resolved = resolveAccounts({
        addressTableLookups: version === 0 ? lookups : undefined,
        header: resolvedHeader,
        loadedAddresses: groupLoadedAddresses(loadedAddresses),
        staticKeys: accountKeys.map(key => address(key)),
        version,
    });

    validateInstructionIndices(message.instructions, resolved.accounts.length);

    const instructions = message.instructions.map(ix => ({
        accounts: ix.accounts.map(index => resolved.accounts[index]),
        data: new Uint8Array(BASE58_ENCODER.encode(ix.data)),
        programAddress: resolved.accounts[ix.programIdIndex].address,
    }));

    return buildTransaction({
        config: fromRpcTransactionConfig(message.transactionConfig),
        instructions,
        lifetimeToken: message.recentBlockhash,
        lookups,
        resolved,
        signatures: [...transaction.signatures],
        version,
    });
}

/**
 * jsonParsed already resolves account roles, so header and index validation is not required.
 * It never reports lookup table addresses.
 */
function fromJsonParsedTransaction(
    transaction: RpcJsonParsedTransaction,
    version: TransactionVersion,
): ParsedTransaction {
    const { message } = transaction;

    const accounts: TransactionAccount[] = message.accountKeys.map(key => ({
        address: address(key.pubkey),
        signer: key.signer,
        source: key.source === 'transaction' ? 'static' : 'lookupTable',
        writable: key.writable,
    }));
    const byAddress = new Map(accounts.map(account => [account.address, account] as const));

    const instructions: TransactionInstruction[] = message.instructions.map(ix => {
        const programAddress = address(ix.programId);
        if ('parsed' in ix) return { accounts: [], parsed: ix.parsed, programAddress };

        return {
            accounts: ix.accounts.map(pubkey => ensureAccountExists(byAddress, address(pubkey))),
            data: new Uint8Array(BASE58_ENCODER.encode(ix.data)),
            programAddress,
        };
    });

    return buildTransaction({
        config: fromRpcTransactionConfig(message.transactionConfig),
        instructions,
        lifetimeToken: message.recentBlockhash,
        lookups: undefined,
        resolved: { accounts },
        signatures: [...transaction.signatures],
        version,
    });
}

function buildTransaction(parts: {
    config: ReturnType<typeof readTransactionConfig>;
    instructions: TransactionInstruction[];
    lifetimeToken: string;
    /** `undefined` means the encoding never reported the tables, as `jsonParsed` does not. */
    lookups: readonly AddressTableLookup[] | undefined;
    resolved: AccountResolutionResult;
    signatures: readonly (string | undefined)[];
    version: TransactionVersion;
}): ParsedTransaction {
    const base = {
        accounts: parts.resolved.accounts,
        instructions: parts.instructions,
        lifetimeToken: parts.lifetimeToken,
        numSignerAccounts: parts.resolved.accounts.filter(account => account.signer).length,
        signatures: parts.signatures,
        ...(parts.resolved.unmatchedLookupTableAddresses && {
            unmatchedLookupTableAddresses: parts.resolved.unmatchedLookupTableAddresses,
        }),
        ...(parts.resolved.unmatchedLookupTableIndexes && {
            unmatchedLookupTableIndexes: parts.resolved.unmatchedLookupTableIndexes,
        }),
    };

    if (parts.version === 0) {
        return { ...base, ...(parts.lookups !== undefined && { addressTableLookups: parts.lookups }), version: 0 };
    }
    if (parts.version === 1) return { ...base, version: 1, ...(parts.config && { config: parts.config }) };
    return { ...base, version: 'legacy' };
}
