import {
    type Address,
    type GetSignaturesForAddressApi,
    type Rpc,
    type Signature,
    type SolanaRpcApi,
} from '@solana/kit';
import bs58 from 'bs58';

export type SolanaRpc = Rpc<SolanaRpcApi>;

// Locked to the JSON / versioned overload of `getTransaction`. The exported
// `TransactionResponse` type is derived from this exact call shape.
export function getTransaction(rpc: SolanaRpc, signature: Signature) {
    return rpc.getTransaction(signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }).send();
}

export function getSignaturesPage(rpc: SolanaRpc, account: Address, options: { before?: Signature; limit?: number }) {
    return rpc.getSignaturesForAddress(account, options).send();
}

export type TransactionResponse = NonNullable<Awaited<ReturnType<typeof getTransaction>>>;
export type SignatureInfo = ReturnType<GetSignaturesForAddressApi['getSignaturesForAddress']>[number];

export interface RawTransaction {
    info: SignatureInfo;
    transaction: TransactionResponse;
}

export interface InstructionView {
    programAddress: Address;
    data: Uint8Array;
    accounts: readonly Address[];
}

/** Yields every instruction (outer + inner CPI) from a kit `getTransaction` response,
 * with account indexes resolved against the static keys + ALT-loaded addresses.
 * Pass `programAddress` to filter to instructions invoking that program. */
export function* walkInstructions(tx: TransactionResponse, programAddress?: Address): Iterable<InstructionView> {
    const keys = resolveAccountKeys(tx);
    for (const ix of tx.transaction.message.instructions) {
        const view = toView(ix, keys);
        if (programAddress === undefined || view.programAddress === programAddress) yield view;
    }
    for (const inner of tx.meta?.innerInstructions ?? []) {
        for (const ix of inner.instructions) {
            const view = toView(ix, keys);
            if (programAddress === undefined || view.programAddress === programAddress) yield view;
        }
    }
}

// Versioned-tx key order: static keys, then ALT writable, then ALT readonly.
// Matches how the runtime resolves instruction account indexes.
function resolveAccountKeys(tx: TransactionResponse): readonly Address[] {
    const loaded = tx.meta?.loadedAddresses;
    if (!loaded) return tx.transaction.message.accountKeys;
    return [...tx.transaction.message.accountKeys, ...loaded.writable, ...loaded.readonly];
}

function toView(
    ix: TransactionResponse['transaction']['message']['instructions'][number],
    keys: readonly Address[],
): InstructionView {
    return {
        accounts: ix.accounts.map(idx => keys[idx]),
        data: bs58.decode(ix.data),
        programAddress: keys[ix.programIdIndex],
    };
}
