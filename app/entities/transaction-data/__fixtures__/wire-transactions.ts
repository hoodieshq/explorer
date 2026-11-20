import { gen } from '@__fixtures__/gen';
import {
    address,
    appendTransactionMessageInstruction,
    blockhash,
    compileTransaction,
    createTransactionMessage,
    getTransactionEncoder,
    pipe,
    setTransactionMessageComputeUnitLimit,
    setTransactionMessageFeePayer,
    setTransactionMessageHeapSize,
    setTransactionMessageLifetimeUsingBlockhash,
    setTransactionMessageLoadedAccountsDataSizeLimit,
    setTransactionMessagePriorityFeeLamports,
} from '@solana/kit';
import {
    AddressLookupTableAccount,
    ComputeBudgetProgram,
    PublicKey,
    SystemProgram,
    TransactionMessage,
} from '@solana/web3.js';

export const FEE_PAYER = address(gen.address(1));
export const RECIPIENT = address(gen.address(2));
const PROGRAM = address(gen.address(3));
const LOOKUP_TABLE = address(gen.address(4));
const BLOCKHASH = blockhash(gen.blockhash());

export type V1ConfigOverrides = {
    computeUnitLimit?: number;
    heapSize?: number;
    loadedAccountsDataSizeLimit?: number;
    priorityFeeLamports?: bigint;
};

type Web3MessageOptions = { computeUnitLimit?: number };

/** Wire bytes of an unsigned v1 transaction carrying whichever resource limits are passed. */
export function createV1TransactionBytes(config: V1ConfigOverrides): Uint8Array {
    const message = pipe(
        createTransactionMessage({ version: 1 }),
        m => setTransactionMessageFeePayer(FEE_PAYER, m),
        m => setTransactionMessageLifetimeUsingBlockhash({ blockhash: BLOCKHASH, lastValidBlockHeight: 100n }, m),
        m =>
            appendTransactionMessageInstruction(
                { accounts: [{ address: RECIPIENT, role: 1 }], data: new Uint8Array([1]), programAddress: PROGRAM },
                m,
            ),
        // Every setter treats `undefined` as "leave unset", so omitted limits need no branching.
        m => setTransactionMessageComputeUnitLimit(config.computeUnitLimit, m),
        m => setTransactionMessageHeapSize(config.heapSize, m),
        m => setTransactionMessageLoadedAccountsDataSizeLimit(config.loadedAccountsDataSizeLimit, m),
        // The cast is needed only because the `@ts-expect-error` above leaves the message typed as
        // `legacy | 0`; this setter is constrained to `{ version: 1 }`.
        m => setTransactionMessagePriorityFeeLamports(config.priorityFeeLamports, m as typeof m & { version: 1 }),
    );

    return new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
}

/** A single-transfer web3.js message, for the versions web3.js can build. */
export function createWeb3TransactionMessage({ computeUnitLimit }: Web3MessageOptions = {}): TransactionMessage {
    const transfer = SystemProgram.transfer({
        fromPubkey: new PublicKey(FEE_PAYER),
        lamports: 1n,
        toPubkey: new PublicKey(RECIPIENT),
    });

    return new TransactionMessage({
        instructions:
            computeUnitLimit === undefined
                ? [transfer]
                : [transfer, ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })],
        payerKey: new PublicKey(FEE_PAYER),
        recentBlockhash: PublicKey.default.toBase58(),
    });
}

/** Wire bytes of an unsigned legacy or v0 transaction. */
export function createWeb3TransactionBytes(version: 'legacy' | 0, options: Web3MessageOptions = {}): Uint8Array {
    const message = createWeb3TransactionMessage(options);
    const compiled = version === 'legacy' ? message.compileToLegacyMessage() : message.compileToV0Message();

    return toUnsignedWireBytes(compiled.serialize());
}

/** Wire bytes of an unsigned v0 transfer whose recipient loads from a lookup table, not from the static keys. */
export function createV0LookupTableTransactionBytes(): Uint8Array {
    const lookupTable = new AddressLookupTableAccount({
        key: new PublicKey(LOOKUP_TABLE),
        state: {
            addresses: [new PublicKey(RECIPIENT)],
            authority: undefined,
            deactivationSlot: BigInt('18446744073709551615'),
            lastExtendedSlot: 0,
            lastExtendedSlotStartIndex: 0,
        },
    });

    return toUnsignedWireBytes(createWeb3TransactionMessage().compileToV0Message([lookupTable]).serialize());
}

/**
 * Signatures on the wire are fixed-count and zero-filled until signed, so an unsigned transaction
 * carries one all-zero signature for its fee payer.
 */
function toUnsignedWireBytes(messageBytes: Uint8Array): Uint8Array {
    const bytes = new Uint8Array(1 + 64 + messageBytes.length);
    bytes[0] = 1;
    bytes.set(messageBytes, 1 + 64);

    return bytes;
}
