import type { SolanaRpc } from '@entities/cluster/@x/transaction-data';
import { decodeCompiledMessage, fromCompiledMessage, type ParsedTransaction } from '@explorer/parsers/transaction';
import type { CompiledTransactionMessage, CompiledTransactionMessageWithLifetime } from '@solana/kit';

import { resolveAddressLookupTables } from './resolve-address-lookup-tables';

export type CompiledMessage = CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;

export type ParsedMessage = { compiled: CompiledMessage; transaction: ParsedTransaction };

/**
 * Decodes message bytes and loads the addresses a v0 message reads from its lookup tables, so every account is known.
 * Ignores bytes past the end of the message.
 * Throws when the bytes do not decode, the header or an account index is invalid, or a lookup table cannot load.
 */
export async function parseMessageWithLookupTables(rpc: SolanaRpc, messageBytes: Uint8Array): Promise<ParsedMessage> {
    const compiled = decodeCompiledMessage(messageBytes);
    const lookups = compiled.version === 0 ? (compiled.addressTableLookups ?? []) : [];
    const loadedAddresses = await resolveAddressLookupTables(rpc, lookups);

    return { compiled, transaction: fromCompiledMessage(compiled, { loadedAddresses }) };
}
