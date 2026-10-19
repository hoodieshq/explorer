import { fromCompiledMessage } from '@explorer/parsers/transaction';
import {
    blockhash,
    type CompiledTransactionMessage,
    type CompiledTransactionMessageWithLifetime,
    lamports,
} from '@solana/kit';

import type { BlockData, BlockTransaction, BlockTransactionMeta } from '../model/types';

type Message = CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

const BLOCKHASH = blockhash('11111111111111111111111111111111');
// The package rejects a message without a signer, so the first static account is the fee payer.
const FEE_PAYER_ONLY = { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 1 };

export function makeBlockTransaction({
    index = 0,
    message,
    meta = {},
    signatures,
}: {
    index?: number;
    message: DistributiveOmit<Message, 'header' | 'lifetimeToken'> & { header?: Message['header'] };
    meta?: Partial<BlockTransactionMeta> | null;
    signatures?: readonly string[];
}): BlockTransaction {
    return {
        index,
        meta: meta === null ? null : { err: null, fee: lamports(0n), logMessages: [], ...meta },
        parsedTransaction: fromCompiledMessage(
            { header: FEE_PAYER_ONLY, ...message, lifetimeToken: BLOCKHASH },
            { signatures },
        ),
    };
}

export function makeBlock(transactions: BlockData['transactions']): BlockData {
    return {
        blockTime: null,
        blockhash: BLOCKHASH,
        parentSlot: 0n,
        previousBlockhash: BLOCKHASH,
        rewards: [],
        transactions,
    };
}
