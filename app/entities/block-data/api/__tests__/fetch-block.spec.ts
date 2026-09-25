import { gen } from '@__fixtures__/gen';
import type * as SolanaKit from '@solana/kit';
import {
    AccountRole,
    type Address,
    address,
    appendTransactionMessageInstruction,
    blockhash,
    compileTransaction,
    createTransactionMessage,
    getTransactionEncoder,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toBase64 } from '@/app/shared/lib/bytes';

import { LEGACY_BLOCK_RESPONSE, V1_BLOCK_RESPONSE } from '../../__fixtures__/block-responses';
import { fetchBlock } from '../fetch-block';

// The global setup stubs `createSolanaRpc` so no test reaches the network; these tests exercise the
// real client against a stubbed `fetch` instead.
vi.mock('@solana/kit', async () => await vi.importActual<typeof SolanaKit>('@solana/kit'));

const URL = 'https://mock.rpc';
const SLOT = 440_572_822;

const fetchMock = vi.fn();

function respondWith(result: unknown) {
    const body = JSON.stringify({ id: 1, jsonrpc: '2.0', result });
    // kit reads the body as text so it can upcast integers to bigints as it parses.
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => body });
}

function requestBody() {
    return JSON.parse(fetchMock.mock.calls[0][1].body);
}

const V0_FEE_PAYER = address(gen.address(11));
const V0_PROGRAM = address(gen.address(12));
const V0_LOOKUP_TABLE_ADDRESS = address(gen.address(13));
const V0_LOOKUP_TABLE_LOADED_ADDRESS = address(gen.address(14));
const V0_BLOCKHASH = blockhash(gen.blockhash());

type LookupTableOverride = { loadedAddress: Address; lookupTableAddress: Address };

/** Wire bytes of an unsigned v0 transaction, optionally with one instruction reading an ALT account. */
function v0TransactionBytes(lookup?: LookupTableOverride): Uint8Array {
    const instruction = lookup
        ? {
              accounts: [
                  {
                      address: lookup.loadedAddress,
                      addressIndex: 0,
                      lookupTableAddress: lookup.lookupTableAddress,
                      role: AccountRole.WRITABLE,
                  },
              ],
              data: new Uint8Array([1]),
              programAddress: V0_PROGRAM,
          }
        : { data: new Uint8Array([1]), programAddress: V0_PROGRAM };

    const message = pipe(
        createTransactionMessage({ version: 0 }),
        m => setTransactionMessageFeePayer(V0_FEE_PAYER, m),
        m => setTransactionMessageLifetimeUsingBlockhash({ blockhash: V0_BLOCKHASH, lastValidBlockHeight: 100n }, m),
        m => appendTransactionMessageInstruction(instruction, m),
    );

    return new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
}

/** A `getBlock` response with one v0 transaction, optionally reporting one loaded ALT address. */
function v0BlockResponse(lookup?: LookupTableOverride) {
    return {
        blockTime: 1_787_266_078,
        blockhash: 'SURFNETxSAFEHASHxxxxxxxxxxxxxxxxxxx1a429ax9',
        parentSlot: 440_572_821,
        previousBlockhash: 'SURFNETxSAFEHASHxxxxxxxxxxxxxxxxxxx1a429ax8',
        rewards: [],
        transactions: [
            {
                meta: {
                    computeUnitsConsumed: 150,
                    err: null,
                    fee: 5000,
                    innerInstructions: [],
                    loadedAddresses: lookup
                        ? { readonly: [], writable: [lookup.loadedAddress] }
                        : { readonly: [], writable: [] },
                    logMessages: [],
                    postBalances: [1, 1],
                    postTokenBalances: [],
                    preBalances: [1, 1],
                    preTokenBalances: [],
                },
                transaction: [toBase64(v0TransactionBytes(lookup)), 'base64'],
            },
        ],
    };
}

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('fetchBlock', () => {
    it('should ask for base64 transactions at the newest version Explorer renders', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        await fetchBlock(URL, SLOT);

        expect(requestBody().params).toEqual([
            SLOT,
            {
                commitment: 'confirmed',
                encoding: 'base64',
                maxSupportedTransactionVersion: 1,
                rewards: true,
                transactionDetails: 'full',
            },
        ]);
    });

    it('should return null when the RPC does not hold the block', async () => {
        respondWith(null);

        await expect(fetchBlock(URL, SLOT)).resolves.toBeNull();
    });

    it('should read a v1 transaction that a maxSupportedTransactionVersion of 0 would reject', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions).toHaveLength(1);
        expect(block?.transactions[0].version).toBe(1);
    });

    it('should surface a v1 transaction resource limits from the message config', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].transactionConfig).toEqual({
            computeUnitLimit: 10_000,
            loadedAccountsDataSizeLimit: 65_536,
        });
    });

    it('should expose a v1 message through the web3.js interface the block cards read', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);
        const message = block?.transactions[0].transaction.message;

        expect(message?.compiledInstructions).toHaveLength(1);
        expect(message?.staticAccountKeys).toHaveLength(3);
        expect(message?.isAccountWritable(0)).toBe(true);
        expect(message?.getAccountKeys({ accountKeysFromLookups: undefined }).get(2)?.toBase58()).toBe(
            '11111111111111111111111111111111',
        );
    });

    it('should carry no resource limits for a legacy transaction', async () => {
        respondWith(LEGACY_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].version).toBe('legacy');
        expect(block?.transactions[0].transactionConfig).toBeUndefined();
    });

    it('should narrow meta amounts to the numbers web3.js consumers expect', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);
        const meta = block?.transactions[0].meta;

        expect(meta?.fee).toBe(5000);
        expect(meta?.computeUnitsConsumed).toBe(150);
        expect(meta?.preBalances).toEqual([1_000_000_000, 0, 1]);
        expect(meta?.logMessages).toHaveLength(2);
    });

    it('should adapt a transaction whose meta omits inner instructions and loaded addresses', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const meta = { ...transaction.meta, innerInstructions: undefined, loadedAddresses: undefined };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].meta?.innerInstructions).toBeUndefined();
        expect(block?.transactions[0].meta?.loadedAddresses).toBeUndefined();
        expect(block?.transactions[0].version).toBe('legacy');
    });

    it('should adapt a transaction with no meta recorded', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta: null }] });

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].meta).toBeNull();
    });

    it('should report the block header fields the overview renders', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.blockhash).toBe(V1_BLOCK_RESPONSE.blockhash);
        expect(block?.previousBlockhash).toBe(V1_BLOCK_RESPONSE.previousBlockhash);
        expect(block?.parentSlot).toBe(440_572_821);
        expect(block?.blockTime).toBe(1_787_266_078);
    });

    it('should carry a commission only on the rewards that have one', async () => {
        respondWith({
            ...V1_BLOCK_RESPONSE,
            rewards: [
                { commission: 5, lamports: 12, postBalance: 100, pubkey: 'Vote111', rewardType: 'Voting' },
                { lamports: 3, postBalance: 50, pubkey: 'Fee111', rewardType: 'Fee' },
            ],
        });

        const block = await fetchBlock(URL, SLOT);

        expect(block?.rewards?.[0].commission).toBe(5);
        expect(block?.rewards?.[1].commission).toBeUndefined();
    });

    it('should keep the readable transactions when one cannot be decoded', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        respondWith({
            ...LEGACY_BLOCK_RESPONSE,
            transactions: [{ ...transaction, transaction: ['not-base64-bytes', 'base64'] }, transaction],
        });

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions).toHaveLength(1);
        expect(block?.transactions[0].version).toBe('legacy');
    });

    it('should drop a transaction whose meta does not match the shape the cards read', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const meta = { ...transaction.meta, postBalances: 'not-an-array' };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions).toEqual([]);
    });

    it('should adapt a transaction whose meta records no token balances', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const meta = { ...transaction.meta, postTokenBalances: null, preTokenBalances: null };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].meta?.postTokenBalances).toBeUndefined();
        expect(block?.transactions[0].meta?.preTokenBalances).toBeUndefined();
    });

    it('should reject a block that is missing the fields every subpage renders', async () => {
        const withoutBlockhash = { ...V1_BLOCK_RESPONSE, blockhash: undefined };
        respondWith(withoutBlockhash);

        await expect(fetchBlock(URL, SLOT)).rejects.toThrow();
    });

    it('should render each transaction signature in signer order', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].transaction.signatures).toEqual([
            '3S16GMLh2fH28SAhXWRRqogYudd8MPvZD39Ee22ZS6F2jeJQLhYNpKfdkZxo49dnKDsoXvtdBxQFRaDbvd1QnZaW',
        ]);
    });

    it('should build the union transaction next to the web3.js message for a v1 transaction', async () => {
        respondWith(V1_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].parsedTransaction.version).toBe(1);
    });

    it('should build the union transaction next to the web3.js message for a legacy transaction', async () => {
        respondWith(LEGACY_BLOCK_RESPONSE);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions[0].parsedTransaction.version).toBe('legacy');
    });

    it('should carry an empty address table lookups list for a v0 transaction with no lookup tables', async () => {
        respondWith(v0BlockResponse());

        const block = await fetchBlock(URL, SLOT);
        const parsed = block?.transactions[0].parsedTransaction;

        // `[]` means the message lists none, distinct from `undefined` for an encoding that omits them.
        expect(parsed?.version === 0 ? parsed.addressTableLookups : undefined).toEqual([]);
    });

    it("should resolve a v0 instruction's lookup-table account from the block meta's loaded address", async () => {
        respondWith(
            v0BlockResponse({ loadedAddress: V0_LOOKUP_TABLE_LOADED_ADDRESS, lookupTableAddress: V0_LOOKUP_TABLE_ADDRESS }),
        );

        const block = await fetchBlock(URL, SLOT);
        const lookupAccount = block?.transactions[0].parsedTransaction.accounts.find(
            account => account.address === V0_LOOKUP_TABLE_LOADED_ADDRESS,
        );

        expect(lookupAccount?.source).toBe('lookupTable');
    });

    it('should drop a v0 transaction whose lookup-table account the meta does not report', async () => {
        const response = v0BlockResponse({
            loadedAddress: V0_LOOKUP_TABLE_LOADED_ADDRESS,
            lookupTableAddress: V0_LOOKUP_TABLE_ADDRESS,
        });
        response.transactions[0].meta.loadedAddresses = { readonly: [], writable: [] };
        respondWith(response);

        const block = await fetchBlock(URL, SLOT);

        expect(block?.transactions).toEqual([]);
    });
});
