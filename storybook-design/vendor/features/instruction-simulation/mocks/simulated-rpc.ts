/* eslint-disable unicorn/no-null -- these deliberately mirror the nullable shapes web3.js RPC
   methods return: `getMultiple*` yield `null` for missing accounts and the interpret pipeline keys
   off those exact values. */
/* eslint-disable @typescript-eslint/consistent-type-assertions -- casts are how the fixture is
   coerced into web3.js' RPC response types when patching Connection's prototype. */
import {
    type AccountInfo,
    Connection,
    type ParsedAccountData,
    PublicKey,
    type SimulatedTransactionAccountInfo,
    VersionedMessage,
} from '@solana/web3.js';

import captureJson from './simulation-capture.json';

// Real RPC responses captured from a mainnet SPL-token transaction (see `sourceSignature`),
// recorded by `capture-simulation.mjs`. Replaying them lets Storybook/tests render the
// SimulationCard's `done` state — logs, CU profiling, SOL balance changes, and token balances —
// through the exact interpret pipeline the app runs in production, without touching the network.
//
// Non-token account data blobs were blanked at capture time: `computeSolBalanceChanges` only reads
// `lamports`, and token parsing only touches token-program-owned accounts, so those blobs are dead
// weight for the UI.

type PreData = { kind: 'parsed'; value: ParsedAccountData } | { kind: 'buffer'; base64: string };

type PreAccountFixture = {
    owner: string;
    lamports: number;
    executable: boolean;
    rentEpoch: number;
    space: number;
    data: PreData;
} | null;

type SimAccountFixture = {
    owner: string;
    lamports: number;
    executable: boolean;
    rentEpoch: number;
    dataBase64: string;
} | null;

type LutInfoFixture = {
    key: string;
    dataBase64: string;
    owner: string;
    lamports: number;
    executable: boolean;
    rentEpoch: number;
} | null;

type CaptureFixture = {
    sourceSignature: string;
    rpc: string;
    messageBase64: string;
    messageVersion: number;
    accountKeys: string[];
    lutInfos: LutInfoFixture[];
    epoch: number;
    parsedAccountsPre: PreAccountFixture[];
    simulation: {
        err: unknown;
        logs: string[];
        unitsConsumed: number;
        accounts: SimAccountFixture[];
    };
};

const capture = captureJson as CaptureFixture;

// Synthetic slot — the interpret pipeline never reads it, only the RPC envelope shape requires it.
const SLOT = 0;

/** The captured transaction message, rebuilt so `useSimulation` can fingerprint and simulate it. */
export const simulatedMessage: VersionedMessage = VersionedMessage.deserialize(
    Buffer.from(capture.messageBase64, 'base64'),
);

function hydrateLutInfos(): (AccountInfo<Buffer> | null)[] {
    return capture.lutInfos.map(info =>
        info
            ? {
                  data: Buffer.from(info.dataBase64, 'base64'),
                  executable: info.executable,
                  lamports: info.lamports,
                  owner: new PublicKey(info.owner),
                  rentEpoch: info.rentEpoch,
              }
            : null,
    );
}

function hydratePreAccounts(): (AccountInfo<ParsedAccountData | Buffer> | null)[] {
    return capture.parsedAccountsPre.map(account =>
        account
            ? {
                  data:
                      account.data.kind === 'parsed' ? account.data.value : Buffer.from(account.data.base64, 'base64'),
                  executable: account.executable,
                  lamports: account.lamports,
                  owner: new PublicKey(account.owner),
                  rentEpoch: account.rentEpoch,
                  space: account.space,
              }
            : null,
    );
}

function hydrateSimAccounts(): (SimulatedTransactionAccountInfo | null)[] {
    return capture.simulation.accounts.map(account =>
        account
            ? {
                  data: [account.dataBase64, 'base64'],
                  executable: account.executable,
                  lamports: account.lamports,
                  owner: account.owner,
                  rentEpoch: account.rentEpoch,
              }
            : null,
    );
}

type PatchedMethods = Pick<
    Connection,
    'getMultipleAccountsInfo' | 'getMultipleParsedAccounts' | 'getEpochInfo' | 'simulateTransaction'
>;

/**
 * Stub `Connection`'s RPC methods on the prototype so any connection created during a story/test
 * replays the captured simulation instead of hitting the network. Returns a restore function.
 */
export function installSimulatedRpc(): () => void {
    const proto = Connection.prototype as unknown as PatchedMethods;
    const original: PatchedMethods = {
        getEpochInfo: proto.getEpochInfo,
        getMultipleAccountsInfo: proto.getMultipleAccountsInfo,
        getMultipleParsedAccounts: proto.getMultipleParsedAccounts,
        simulateTransaction: proto.simulateTransaction,
    };

    const patched = {
        getEpochInfo: async () => ({
            absoluteSlot: SLOT,
            blockHeight: 0,
            epoch: capture.epoch,
            slotIndex: 0,
            slotsInEpoch: 432_000,
            transactionCount: 0,
        }),
        getMultipleAccountsInfo: async () => hydrateLutInfos(),
        getMultipleParsedAccounts: async () => ({ context: { slot: SLOT }, value: hydratePreAccounts() }),
        simulateTransaction: async () => ({
            context: { slot: SLOT },
            value: {
                accounts: hydrateSimAccounts(),
                err: capture.simulation.err,
                logs: capture.simulation.logs,
                unitsConsumed: capture.simulation.unitsConsumed,
            },
        }),
    } as unknown as PatchedMethods;

    Object.assign(proto, patched);

    return () => {
        Object.assign(proto, original);
    };
}
