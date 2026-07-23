import type { AutocompleteItem } from '@components/shared/ui/autocomplete';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// Reuse the SAME real transaction that the tx-page slice renders, so every primitive on the
// gallery is fed a real on-chain entity rather than invented data.
import rawTx from '../tx-page/tx-real.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC JSON is loosely typed
const message: any = rawTx.transaction.message;

const truncate = (value: string) => `${value.slice(0, 4)}…${value.slice(-4)}`;

export const SIGNATURE: string = rawTx.transaction.signatures[0];

/** Fee payer of the real transaction — a genuine base58 account. */
export const FEE_PAYER = new PublicKey(message.accountKeys[0].pubkey);
/** Wrapped-SOL mint, referenced by the transaction's token instructions. */
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
/** The pAMM program invoked by the transaction. */
export const PROGRAM_ID = new PublicKey(message.accountKeys.find((k: any) => !k.signer)?.pubkey ?? message.accountKeys[2].pubkey);

/** Real instruction bytes (the pAMM swap, instruction #3) decoded from base58. */
export const RAW_INSTRUCTION_DATA: Uint8Array = bs58.decode(message.instructions[3].data);

/** Distinct program names touched by the transaction — used as tag/badge entities. */
export const PROGRAM_TAGS: string[] = Array.from(
    new Set(message.instructions.map((ix: any) => ix.program).filter(Boolean)),
);

/** First 8 account keys as autocomplete options. */
export const ACCOUNT_ITEMS: AutocompleteItem[] = message.accountKeys.slice(0, 8).map((k: any) => ({
    keywords: [k.pubkey],
    label: truncate(k.pubkey),
    value: k.pubkey,
}));

/** Post-transaction token balances as table rows. */
export const TOKEN_ROWS = (rawTx.meta.postTokenBalances ?? []).map((b: any) => ({
    account: truncate(message.accountKeys[b.accountIndex].pubkey),
    amount: b.uiTokenAmount.uiAmountString as string,
    decimals: b.uiTokenAmount.decimals as number,
    mint: truncate(b.mint),
}));

/** Human-readable transaction facts, reused across label/badge/input examples. */
export const TX_FACTS = {
    computeUnits: rawTx.meta.computeUnitsConsumed as number,
    feeLamports: rawTx.meta.fee as number,
    result: rawTx.meta.err ? 'Failed' : 'Success',
    slot: rawTx.slot as number,
};

export const EXTERNAL_URL = `https://solscan.io/tx/${SIGNATURE}`;
