import type { ParsedTransaction } from '@explorer/parsers/transaction';
import type {
    CompiledInnerInstruction,
    ParsedTransactionWithMeta,
    TransactionMessage,
    VersionedMessage,
} from '@solana/web3.js';

/** A parsed transaction in the shape that currently is consumed by transaction detail page. */
export type TransactionWithMeta = ParsedTransactionWithMeta;

type RawTransactionBase = {
    /** Unix timestamp in seconds. */
    blockTime?: number;
    messageBytes: Uint8Array;
    meta?: {
        innerInstructions?: CompiledInnerInstruction[];
        postBalances: number[];
        preBalances: number[];
    };
    /** Parsed from the same bytes. */
    parsedTransaction: ParsedTransaction;
    /**
     * Wire size in bytes: signatures plus the compiled message, as the network holds it.
     *
     * Kit's `getTransactionSize` over the decoded transaction, so it needs no per-version knowledge
     * of the envelope — v1 drops the signature-count byte that earlier versions carry.
     */
    serializedSize: number;
    /** Base58-encoded in signer order; a signer slot that has not been signed is `undefined`. */
    signatures: (string | undefined)[];
    /** The slot that confirmed the transaction. */
    slot: number;
};

/**
 * A transaction's wire bytes and the parts of its metadata the inspector needs.
 */
export type RawTransaction = RawTransactionBase & {
    message: VersionedMessage;
    transaction: TransactionMessage;
};
