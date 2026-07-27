/**
 * Mock data + providers for the Transaction Inspector permalink slice
 * (route: /tx/[signature]/inspect → TransactionInspectorPage in signature mode).
 *
 * The fixtures below are pulled from a REAL mainnet transaction
 * (signature `3Xvv451g…RCmnj`, a "MakePurchase" tx). The raw transaction is
 * deserialized with @solana/web3.js so every card genuinely parses/serializes it
 * (SimulatorCard hashes `message.serialize()`, InstructionsSection decompiles it,
 * AccountsCard reads its account keys, etc.). The raw-transaction cache is
 * pre-seeded keyed by signature so PermalinkView renders the loaded view without
 * firing any RPC, and the MSW handlers replay the real on-chain account state and
 * simulation result so the address/accounts block and the transaction-simulation
 * block show real data.
 */
import { InstructionParserProvider } from '@entities/instruction-parser';
import {
    type Account,
    DispatchContext as AccountsDispatchContext,
    FetchersContext as AccountsFetchersContext,
    type State as AccountsState,
    StateContext as AccountsStateContext,
} from '@providers/accounts';
import type { CacheEntry } from '@providers/cache';
import { FetchStatus } from '@providers/cache';
import type { Details as RawDetails } from '@providers/transactions/raw';
import { PublicKey, TransactionMessage, type VersionedMessage, VersionedTransaction } from '@solana/web3.js';
import { MockClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockTokenInfoBatchProvider } from '@storybook-config/__mocks__/MockTokenInfoBatchProvider';
import { MockTransactionsProvider } from '@storybook-config/__mocks__/MockTransactionsProvider';
import { createNextjsParameters } from '@storybook-config/decorators';
import { http, HttpResponse } from 'msw';
import React from 'react';

import { instructionParserDispatcher } from '@/app/tx/instruction-parser-dispatcher';
import { MAINNET_BETA_URL } from '@/app/utils/cluster';

// The signature of the inspected transaction (matches the /inspect permalink URL).
export const SIGNATURE = '3Xvv451gogZKu87vQQoWMrNsy6ajtwXkqPGuKvkYuAngyDk36eUfV6GSrrXp8LJVSbE63Di3YzTDzjWWDvqRCmnj';

// The recent blockhash carried by the real transaction.
const RECENT_BLOCKHASH = 'DGUfqJLngAcMbgQ9ajxwLhrSxeyEnU9QFeK4ekuRLKdP';

// The full, real transaction (signatures + message) fetched from mainnet via
// `getTransaction(..., { encoding: 'base64' })`. Deserialized below so all cards
// parse genuine on-chain bytes.
const RAW_TRANSACTION_BASE64 =
    'AX6028hDkt8Rh42dUWwqq4X2Y9nO+m2A+7dpkTSPRFZx8nOLwA1pMLkQzggUUgd8CzvGcUheyte9ugb7inYG3AQBAAcMarOLMbuWjfT7D+qmgmYmopCDU9mYw98x+2NL5Eb5NaEKLCUIxiZz1qcvAqcWlwiJcrWuB7WkhzDmO6Z4JyFzkGsdojhg9aVgp01cR+uuL/qZzwkOiGo5ca7LF7Si8h8a3kZDokGqtVVZf7FskKTqxz0pfD4ISLBMXVIrIdRVozbYjDeQFztv8ixvbftQ/JjDnv0tpIE8esAKl7n8EiRlIwMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAAm6OiofmqYxJJ72F713XCp+dAkS2s6RYIaZdGCBQlJJXG+nrzvtutOj1l82qryXQxsbvkwtL24OR8pgIDRS9dYQbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACMlyWPTiSJ8bs9ECkUjg2DC1oTmdr/EIQEjnvY2+n4WQTfrXli/7Hdkl0Kn7Xm0AzmGVuouzqR/QfvmGDF6Xu4tkM9xSk5yAMSn8LuLdJKEWbHpgeMiU1nqcnx+f1iv/4FBQAJA6CGAQAAAAAABQAFAoCpAwAGCQEAAgcDBAgJCinBPuOIadTJFAsAAABzdXBlcnRlYW1kZQ0AAABKw6RnZXJtZWlzdGVyAQsBABoGBQMAGMhABgAAAAAEAwAAAQAAAAAAAAAAAAsBAz0KBQUIAoBHBQAAAAAABAMAAAYAAAAAAAAAAAABarOLMbuWjfT7D+qmgmYmopCDU9mYw98x+2NL5Eb5NaEA';

const MOCK_TRANSACTION = VersionedTransaction.deserialize(Buffer.from(RAW_TRANSACTION_BASE64, 'base64'));

export const MOCK_MESSAGE: VersionedMessage = MOCK_TRANSACTION.message;

export const MOCK_RAW_MESSAGE: Uint8Array = MOCK_MESSAGE.serialize();

// A single valid signature (numRequiredSignatures === 1 here).
export const MOCK_SIGNATURES: string[] = [SIGNATURE];

// Real per-account on-chain state, in `staticAccountKeys` order, from
// `getMultipleAccounts`. Lamports use the transaction's pre-balances so the
// address/accounts block is internally consistent with the simulation pre-state.
type AccountMeta = { owner: string; executable: boolean; space: number };

const ACCOUNT_METAS: AccountMeta[] = [
    { executable: false, owner: '11111111111111111111111111111111', space: 0 },
    { executable: false, owner: 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya', space: 3681 },
    { executable: false, owner: '11111111111111111111111111111111', space: 0 },
    { executable: false, owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', space: 165 },
    { executable: false, owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', space: 165 },
    { executable: true, owner: 'NativeLoader1111111111111111111111111111111', space: 22 },
    { executable: true, owner: 'BPFLoaderUpgradeab1e11111111111111111111111', space: 36 },
    { executable: false, owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', space: 82 },
    { executable: true, owner: 'BPFLoaderUpgradeab1e11111111111111111111111', space: 36 },
    { executable: true, owner: 'NativeLoader1111111111111111111111111111111', space: 21 },
    { executable: true, owner: 'BPFLoader2111111111111111111111111111111111', space: 105032 },
    { executable: true, owner: 'BPFLoaderUpgradeab1e11111111111111111111111', space: 36 },
];

// Real pre/post SOL balances from the confirmed transaction meta. Only the fee
// payer (index 0) changes — it pays the 29,000 lamport fee.
export const MOCK_ACCOUNT_BALANCES = {
    postBalances: [
        139874432, 26510640, 171435002, 2039280, 2039280, 1, 1141440, 508418245463, 43712780, 1, 3388604256, 2665446,
    ],
    preBalances: [
        139903432, 26510640, 171435002, 2039280, 2039280, 1, 1141440, 508418245463, 43712780, 1, 3388604256, 2665446,
    ],
};

// Real inner instructions from the transaction meta (a Token-program CPI inside the
// MakePurchase instruction at index 2).
const MOCK_INNER_INSTRUCTIONS = [
    {
        index: 2,
        instructions: [{ accounts: [3, 7, 4, 0], data: 'gX37MVsfGUBn5', programIdIndex: 8 }],
    },
];

// The real program logs emitted by the transaction. Replayed by the simulate
// handler so the Transaction Simulation block renders genuine parsed logs.
const MOCK_SIMULATION_LOGS = [
    'Program ComputeBudget111111111111111111111111111111 invoke [1]',
    'Program ComputeBudget111111111111111111111111111111 success',
    'Program ComputeBudget111111111111111111111111111111 invoke [1]',
    'Program ComputeBudget111111111111111111111111111111 success',
    'Program BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya invoke [1]',
    'Program log: Instruction: MakePurchase',
    'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
    'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 105 of 210473 compute units',
    'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
    'Program data: SSVjFsnkOBVqs4sxu5aN9PsP6qaCZiaikINT2ZjD3zH7Y0vkRvk1oQ0AAABKw6RnZXJtZWlzdGVyIKEHAAAAAABDLixqAAAAAAEXAAAAAAAAABcAAABAc3VwZXJ0ZWFtamFlZ2VybWVpc3RlcgsAAABzdXBlcnRlYW1kZQosJQjGJnPWpy8CpxaXCIlyta4HtaSHMOY7pngnIXOQ',
    'Program BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya consumed 38538 of 239700 compute units',
    'Program BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya success',
    'Program L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95 invoke [1]',
    'Program L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95 consumed 1819 of 201162 compute units',
    'Program L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95 success',
    'Program L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95 invoke [1]',
    'Program L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95 consumed 5660 of 199343 compute units',
    'Program L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95 success',
];

const MOCK_UNITS_CONSUMED = 46317;

// Real epoch info at the time the fixtures were captured.
const MOCK_EPOCH_INFO = {
    absoluteSlot: 434708371,
    blockHeight: 412768194,
    epoch: 1006,
    slotIndex: 116371,
    slotsInEpoch: 432000,
    transactionCount: 531636716499,
};

// Seed the raw-transaction cache so PermalinkView resolves without an RPC call.
const RAW_DETAILS: RawDetails = {
    raw: {
        message: MOCK_MESSAGE,
        meta: {
            innerInstructions: MOCK_INNER_INSTRUCTIONS,
            postBalances: MOCK_ACCOUNT_BALANCES.postBalances,
            preBalances: MOCK_ACCOUNT_BALANCES.preBalances,
        },
        signatures: MOCK_SIGNATURES,
        transaction: TransactionMessage.decompile(MOCK_MESSAGE),
    },
};

export const MOCK_RAW_ENTRIES: Record<string, CacheEntry<RawDetails>> = {
    [SIGNATURE]: {
        data: RAW_DETAILS,
        status: FetchStatus.Fetched,
    },
};

// Map each static account key → its real on-chain metadata (looked up by the RPC handlers).
type ResolvedAccount = AccountMeta & { lamports: number; postLamports: number };
const ACCOUNT_BY_KEY: Record<string, ResolvedAccount> = Object.fromEntries(
    MOCK_MESSAGE.staticAccountKeys.map((key, i) => [
        key.toBase58(),
        {
            ...ACCOUNT_METAS[i],
            lamports: MOCK_ACCOUNT_BALANCES.preBalances[i],
            postLamports: MOCK_ACCOUNT_BALANCES.postBalances[i],
        },
    ]),
);

// Zero-filled base64 blob of the given byte length. The raw bytes are not shown in
// the UI (only account size, owner, and balance are), so this keeps sizes accurate
// without embedding hundreds of KB of program bytecode in the fixture.
function emptyData(space: number): string {
    return Buffer.alloc(space).toString('base64');
}

function makeAccount(pubkey: PublicKey): Account {
    const meta = ACCOUNT_BY_KEY[pubkey.toBase58()];
    return {
        data: {},
        executable: meta.executable,
        lamports: meta.lamports,
        owner: new PublicKey(meta.owner),
        pubkey,
        space: meta.space,
    };
}

const ACCOUNTS_STATE: AccountsState = {
    entries: Object.fromEntries(
        MOCK_MESSAGE.staticAccountKeys.map(key => [
            key.toBase58(),
            { data: makeAccount(key), status: FetchStatus.Fetched },
        ]),
    ),
    url: MAINNET_BETA_URL,
};

const noopFetchers = {
    parsed: { fetch: () => {} },
    raw: { fetch: () => {} },
    skip: { fetch: () => {} },
};

/** Seeds the real accounts contexts so AddressWithContext / AccountsCard resolve without RPC. */
export function MockInspectorAccountsProvider({ children }: { children: React.ReactNode }) {
    return (
        <AccountsStateContext.Provider value={ACCOUNTS_STATE}>
            <AccountsDispatchContext.Provider value={() => {}}>
                {/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- decorator stub */}
                <AccountsFetchersContext.Provider value={noopFetchers as any}>
                    {children}
                </AccountsFetchersContext.Provider>
            </AccountsDispatchContext.Provider>
        </AccountsStateContext.Provider>
    );
}

/** Full provider stack for the inspector permalink view. */
export function MockInspectorProviders({ children }: { children: React.ReactNode }) {
    return (
        <MockClusterProvider>
            <MockTokenInfoBatchProvider>
                <MockTransactionsProvider raw={MOCK_RAW_ENTRIES}>
                    <MockInspectorAccountsProvider>
                        <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                            {children}
                        </InstructionParserProvider>
                    </MockInspectorAccountsProvider>
                </MockTransactionsProvider>
            </MockTokenInfoBatchProvider>
        </MockClusterProvider>
    );
}

/** Decorator form of the provider stack. */
export const withInspectorProviders = (Story: React.ComponentType) => (
    <MockInspectorProviders>
        <Story />
    </MockInspectorProviders>
);

// Next.js navigation params — pathname mirrors the real /inspect permalink route.
export const nextjsParameters = createNextjsParameters({
    pathname: `/tx/${SIGNATURE}/inspect`,
    query: {},
});

/* eslint-disable unicorn/no-null, @typescript-eslint/consistent-type-assertions --
   Mock JSON-RPC boundary: responses must carry literal `null` (JSON null, distinct from a
   dropped `undefined` key), and the untyped request body / params are narrowed via assertions. */

// Build the on-chain account-info shape the RPC returns for a given key.
function accountInfoResponse(base58Key: string, useLamports: 'pre' | 'post') {
    const meta = ACCOUNT_BY_KEY[base58Key];
    if (!meta) return null;
    return {
        data: [emptyData(meta.space), 'base64'],
        executable: meta.executable,
        lamports: useLamports === 'pre' ? meta.lamports : meta.postLamports,
        owner: meta.owner,
        rentEpoch: 0,
        space: meta.space,
    };
}

// Intercept Solana JSON-RPC so the address/accounts block (AccountsCard's
// getMultipleAccounts) and the Transaction Simulation block (simulateTransaction,
// getMultipleAccounts, getEpochInfo) replay the real on-chain state and simulation
// result instead of hitting a live cluster.
export const DEFAULT_HANDLERS = [
    http.post('https://api.mainnet-beta.solana.com', async ({ request }) => {
        const body = (await request.json()) as { id?: number; method?: string; params?: unknown[] };
        const reply = (result: unknown) => HttpResponse.json({ id: body.id ?? 1, jsonrpc: '2.0', result });

        switch (body.method) {
            case 'getMultipleAccounts': {
                const keys = Array.isArray(body.params?.[0]) ? (body.params[0] as string[]) : [];
                return reply({ context: { slot: 0 }, value: keys.map(key => accountInfoResponse(key, 'pre')) });
            }
            case 'getAccountInfo': {
                const key = typeof body.params?.[0] === 'string' ? (body.params[0] as string) : '';
                return reply({ context: { slot: 0 }, value: accountInfoResponse(key, 'pre') });
            }
            case 'getEpochInfo':
                return reply(MOCK_EPOCH_INFO);
            case 'simulateTransaction': {
                const addresses = Array.isArray(MOCK_MESSAGE.staticAccountKeys)
                    ? MOCK_MESSAGE.staticAccountKeys.map(k => k.toBase58())
                    : [];
                return reply({
                    context: { slot: MOCK_EPOCH_INFO.absoluteSlot },
                    value: {
                        accounts: addresses.map(key => accountInfoResponse(key, 'post')),
                        err: null,
                        logs: MOCK_SIMULATION_LOGS,
                        returnData: null,
                        unitsConsumed: MOCK_UNITS_CONSUMED,
                    },
                });
            }
            case 'getLatestBlockhash':
                return reply({
                    context: { slot: 0 },
                    value: { blockhash: RECENT_BLOCKHASH, lastValidBlockHeight: 0 },
                });
            default:
                return reply(null);
        }
    }),
];
/* eslint-enable unicorn/no-null, @typescript-eslint/consistent-type-assertions */
