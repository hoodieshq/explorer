import { gen } from '@__fixtures__/gen';
import { createV0TransactionBytes } from '@__fixtures__/transaction-message';
import { type BlockData, type BlockTransaction, isBlockTransaction } from '@entities/block-data';
import { AccountRole, type Address, address } from '@solana/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fromBase64, toBase64 } from '@/app/shared/lib/bytes';

import { LEGACY_BLOCK_RESPONSE, V1_BLOCK_RESPONSE } from '../../__fixtures__/block-responses';
import { fetchBlock } from '../fetch-block';

vi.mock('@solana/kit', async importOriginal => await importOriginal());

const URL = 'https://mock.rpc';
const SLOT = 440_572_822;
const fetchMock = vi.fn();

function respondWith(result: unknown) {
    const body = JSON.stringify({ id: 1, jsonrpc: '2.0', result });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => body });
}

function requestBody() {
    return JSON.parse(fetchMock.mock.calls[0][1].body);
}

function getTransaction(block: BlockData | null | undefined, index = 0): BlockTransaction {
    const transaction = block?.transactions[index];
    if (!transaction || !isBlockTransaction(transaction)) throw new Error(`Transaction ${index} is unavailable`);
    return transaction;
}

const V0_FEE_PAYER = address(gen.address(11));
const V0_PROGRAM = address(gen.address(12));
const V0_LOOKUP_TABLE = address(gen.address(13));
const V0_LOADED_ADDRESS = address(gen.address(14));

const V0_TRANSACTION_BYTES = createV0TransactionBytes(V0_FEE_PAYER, {
    accounts: [
        {
            address: V0_LOADED_ADDRESS,
            addressIndex: 0,
            lookupTableAddress: V0_LOOKUP_TABLE,
            role: AccountRole.WRITABLE,
        },
    ],
    data: new Uint8Array([1]),
    programAddress: V0_PROGRAM,
});

function v0BlockResponse(loadedAddresses: { readonly: Address[]; writable: Address[] }) {
    const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
    return {
        ...LEGACY_BLOCK_RESPONSE,
        transactions: [
            {
                meta: { ...transaction.meta, loadedAddresses, postBalances: [1, 1], preBalances: [1, 1] },
                transaction: [toBase64(V0_TRANSACTION_BYTES), 'base64'],
                version: 0,
            },
        ],
    };
}

function v1WithUnknownConfigBit() {
    const [transaction] = V1_BLOCK_RESPONSE.transactions;
    const wireBytes = fromBase64(transaction.transaction[0]);
    wireBytes[4] |= 0x20;
    return { ...V1_BLOCK_RESPONSE, transactions: [{ ...transaction, transaction: [toBase64(wireBytes), 'base64'] }] };
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

    it('should parse a v1 transaction and its config', async () => {
        respondWith(V1_BLOCK_RESPONSE);
        const { parsedTransaction } = getTransaction(await fetchBlock(URL, SLOT));

        expect(parsedTransaction.version).toBe(1);
        expect(parsedTransaction).toHaveProperty('config', {
            computeUnitLimit: 10_000,
            loadedAccountsDataSizeLimit: 65_536,
        });
        expect(parsedTransaction.instructions).toHaveLength(1);
        expect(parsedTransaction.accounts[2]?.address).toBe('11111111111111111111111111111111');
    });

    it('should parse a legacy transaction without a config', async () => {
        respondWith(LEGACY_BLOCK_RESPONSE);
        const { parsedTransaction } = getTransaction(await fetchBlock(URL, SLOT));

        expect(parsedTransaction.version).toBe('legacy');
        expect(parsedTransaction).not.toHaveProperty('config');
    });

    it("should resolve a v0 lookup-table account from the meta's loaded addresses", async () => {
        respondWith(v0BlockResponse({ readonly: [], writable: [V0_LOADED_ADDRESS] }));
        const { parsedTransaction } = getTransaction(await fetchBlock(URL, SLOT));

        expect(parsedTransaction.accounts.map(account => account.address)).toEqual([
            V0_FEE_PAYER,
            V0_PROGRAM,
            V0_LOADED_ADDRESS,
        ]);
        expect(parsedTransaction.accounts[2]).toMatchObject({ source: 'lookupTable', writable: true });
    });

    it('should retain an unavailable row for a v0 lookup table with null metadata', async () => {
        const response = v0BlockResponse({ readonly: [], writable: [V0_LOADED_ADDRESS] });
        respondWith({ ...response, transactions: [{ ...response.transactions[0], meta: null }] });

        expect((await fetchBlock(URL, SLOT))?.transactions).toEqual([{ index: 0, unavailable: true }]);
    });

    it('should retain an unavailable row when a v1 config mask sets an unknown bit', async () => {
        respondWith(v1WithUnknownConfigBit());

        expect((await fetchBlock(URL, SLOT))?.transactions).toEqual([{ index: 0, unavailable: true }]);
    });

    it('should keep RPC quantities as bigints', async () => {
        respondWith(V1_BLOCK_RESPONSE);
        const block = await fetchBlock(URL, SLOT);
        const meta = getTransaction(block).meta;

        expect(meta?.fee).toBe(5000n);
        expect(meta?.computeUnitsConsumed).toBe(150n);
        expect(block?.parentSlot).toBe(440_572_821n);
        expect(block?.blockTime).toBe(1_787_266_078n);
    });

    it("should preserve cost units that kit's transaction meta type does not expose", async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const meta = { ...transaction.meta, costUnits: 2_500 };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        expect(getTransaction(await fetchBlock(URL, SLOT)).meta?.costUnits).toBe(2_500n);
    });

    it('should leave cost units undefined when the RPC omits them', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const meta = { ...transaction.meta, costUnits: undefined };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        expect(getTransaction(await fetchBlock(URL, SLOT)).meta?.costUnits).toBeUndefined();
    });

    it('should load a block whose RPC response omits rewards', async () => {
        respondWith({ ...V1_BLOCK_RESPONSE, rewards: undefined });
        const block = await fetchBlock(URL, SLOT);

        expect(block?.rewards).toBeUndefined();
        expect(getTransaction(block).parsedTransaction.signatures).toHaveLength(1);
    });

    it('should ignore token balances that the block pages do not consume', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const tokenBalance = {
            accountIndex: 1,
            mint: 'So11111111111111111111111111111111111111112',
            uiTokenAmount: { amount: '25', decimals: 0, uiAmount: 25, uiAmountString: '25' },
        };
        const meta = {
            ...transaction.meta,
            postTokenBalances: [tokenBalance],
            preTokenBalances: [tokenBalance],
        };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        const block = await fetchBlock(URL, SLOT);
        expect(getTransaction(block).parsedTransaction.version).toBe('legacy');
    });

    it('should retain an unavailable row at its original index when decoding fails', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        respondWith({
            ...LEGACY_BLOCK_RESPONSE,
            transactions: [{ ...transaction, transaction: ['not-base64-bytes', 'base64'] }, transaction],
        });

        const block = await fetchBlock(URL, SLOT);
        expect(block?.transactions).toHaveLength(2);
        expect(block?.transactions[0]).toEqual({ index: 0, unavailable: true });
        expect(getTransaction(block, 1).index).toBe(1);
    });

    it('should retain an unavailable row when required transaction metadata is invalid', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const meta = { ...transaction.meta, fee: 'not-an-integer' };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        const block = await fetchBlock(URL, SLOT);
        expect(block?.transactions).toEqual([{ index: 0, unavailable: true }]);
    });

    it('should preserve null metadata', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta: null }] });

        expect(getTransaction(await fetchBlock(URL, SLOT)).meta).toBeNull();
    });

    it('should reject a block missing a field required by every block page', async () => {
        respondWith({ ...V1_BLOCK_RESPONSE, blockhash: undefined });
        await expect(fetchBlock(URL, SLOT)).rejects.toThrow();
    });

    it('should render transaction signatures in signer order', async () => {
        respondWith(V1_BLOCK_RESPONSE);
        expect(getTransaction(await fetchBlock(URL, SLOT)).parsedTransaction.signatures).toEqual([
            '3S16GMLh2fH28SAhXWRRqogYudd8MPvZD39Ee22ZS6F2jeJQLhYNpKfdkZxo49dnKDsoXvtdBxQFRaDbvd1QnZaW',
        ]);
    });
});
