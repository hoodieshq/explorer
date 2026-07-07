// Mock data + provider wrappers for the `program-account` design slice.
// The program-account page is the /address/[address] route rendered for an
// executable (bpf-upgradeable-loader) account: Header → UpgradeableLoaderAccountSection
// → SecurityNotification → History tab (TransactionHistoryCard).
import { mockAccountHistory, mockConfirmedSignatureInfo } from '@storybook-config/__fixtures__/account-history';
import { MockAccountsProvider } from '@storybook-config/__mocks__/MockAccountsProvider';
import { MockClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockHistoryProvider } from '@storybook-config/__mocks__/MockHistoryProvider';
import { MockTokenInfoBatchProvider } from '@storybook-config/__mocks__/MockTokenInfoBatchProvider';
import { MockTransactionsProvider } from '@storybook-config/__mocks__/MockTransactionsProvider';
import { nextjsParameters } from '@storybook-config/decorators';
import type { Decorator } from '@storybook-config/types';
import { Connection, type ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import React from 'react';
import { SWRConfig, unstable_serialize } from 'swr';

import { LoadingCard } from '@/app/components/common/LoadingCard';
import type { DomainInfo } from '@/app/entities/domain';
import type { NeodymeSecurityTXT } from '@/app/features/security-txt/lib/types';
import { Account, UpgradeableLoaderAccountData } from '@/app/providers/accounts';
import type { ClusterState } from '@/app/providers/cluster';
import { VisibilityProvider } from '@/app/shared/lib/visibility';
import { type OsecRegistryInfo, VerificationStatus } from '@/app/utils/verified-builds';
import { Cluster, ClusterStatus, DEVNET_URL } from '@/app/utils/cluster';

export { nextjsParameters };

// Well-known program (Token Program) — trusted entry in PROGRAM_INFO_BY_ID so the
// ProgramHeader renders "Token Program". Deployed on all clusters incl. devnet.
const PROGRAM_PUBKEY = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const PROGRAM_DATA_PUBKEY = new PublicKey('So11111111111111111111111111111111111111112');
const AUTHORITY_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');
const BPF_UPGRADEABLE_LOADER = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

export const MOCK_PROGRAM_ADDRESS = PROGRAM_PUBKEY.toBase58();

export const MOCK_PROGRAM_DATA = {
    authority: AUTHORITY_PUBKEY,
    data: ['', 'base64' as const] as [string, 'base64'],
    slot: 312_456_789,
};

// Parsed payload for a `program`-type upgradeable loader account.
export const MOCK_PARSED_DATA: UpgradeableLoaderAccountData = {
    parsed: { info: { programData: PROGRAM_DATA_PUBKEY }, type: 'program' },
    program: 'bpf-upgradeable-loader',
    programData: MOCK_PROGRAM_DATA,
};

// Full Account object the address-page Header consumes to render the program header.
export const MOCK_PROGRAM_ACCOUNT: Account = {
    data: { parsed: MOCK_PARSED_DATA },
    executable: true,
    lamports: 5_542_247_638, // ~5.54 SOL
    owner: BPF_UPGRADEABLE_LOADER,
    pubkey: PROGRAM_PUBKEY,
    space: 36,
};

// Args passed to UpgradeableLoaderAccountSection (InfoSection branch for programs).
export const MOCK_SECTION_ARGS = {
    account: MOCK_PROGRAM_ACCOUNT,
    parsedData: MOCK_PARSED_DATA.parsed,
    programData: MOCK_PROGRAM_DATA,
};

// --- Transaction history seed --------------------------------------------------

const SIGNATURES = {
    failed: '5YtADstableSignaturePlaceholderForProgramAccountSlice2LJatM',
    first: '2JgaFstableSignaturePlaceholderForProgramAccountSlice1ZBbGU',
    third: 'dbaW9stableSignaturePlaceholderForProgramAccountSlice3fa3ew',
};

export const MOCK_HISTORY = {
    [MOCK_PROGRAM_ADDRESS]: mockAccountHistory({
        fetched: [
            mockConfirmedSignatureInfo({ blockTime: null, signature: SIGNATURES.first, slot: 312_456_789 }),
            mockConfirmedSignatureInfo({
                blockTime: null,
                err: { InstructionError: [0, 'Custom'] },
                signature: SIGNATURES.failed,
                slot: 312_456_790,
            }),
            mockConfirmedSignatureInfo({ blockTime: null, signature: SIGNATURES.third, slot: 312_456_791 }),
        ],
        foundOldest: false,
    }),
};

export const MOCK_HISTORY_EMPTY = {
    [MOCK_PROGRAM_ADDRESS]: mockAccountHistory({ fetched: [], foundOldest: true }),
};

// --- Data-rendered variant -----------------------------------------------------
// Distinct signatures from MOCK_HISTORY so the module-level transaction-queue cache
// (keyed by `${url}:${signature}`) can't hand back a result another story cached.
// blockTime is populated so the Age/Timestamp columns render too.
const DATA_SIGNATURES = {
    memo: '7QmDdataRenderedSignaturePlaceholderProgramAccountSlice3xk9Zt',
    mint: '4Le8AdataRenderedSignaturePlaceholderProgramAccountSlice2mNpQr',
    transfer: '3KdXBdataRenderedSignaturePlaceholderProgramAccountSlice1vWsLc',
};

const DATA_BLOCK_TIME = 1_716_000_000;

export const MOCK_HISTORY_WITH_DATA = {
    [MOCK_PROGRAM_ADDRESS]: mockAccountHistory({
        fetched: [
            mockConfirmedSignatureInfo({
                blockTime: DATA_BLOCK_TIME,
                signature: DATA_SIGNATURES.transfer,
                slot: 312_456_789,
            }),
            mockConfirmedSignatureInfo({
                blockTime: DATA_BLOCK_TIME - 120,
                signature: DATA_SIGNATURES.mint,
                slot: 312_456_790,
            }),
            mockConfirmedSignatureInfo({
                blockTime: DATA_BLOCK_TIME - 300,
                err: { InstructionError: [0, 'Custom'] },
                signature: DATA_SIGNATURES.memo,
                slot: 312_456_791,
            }),
        ],
        foundOldest: false,
    }),
};

// Program ids used to label the parsed instructions (getProgramName reads programId).
const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');
const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Only `transaction.message.instructions` is consumed by getTransactionInstructionNames:
// each instruction needs a `programId` (PublicKey) and a `parsed.type` string (or a
// string `parsed` for memos). meta can stay minimal.
function mockParsedTx(
    instructions: Array<{ programId: PublicKey; parsed: unknown; program?: string }>,
): ParsedTransactionWithMeta {
    return {
        blockTime: DATA_BLOCK_TIME,
        meta: { err: null, fee: 5000, innerInstructions: [], postBalances: [], preBalances: [] },
        slot: 312_456_789,
        transaction: { message: { accountKeys: [], instructions }, signatures: [] },
    } as unknown as ParsedTransactionWithMeta;
}

const MOCK_PARSED_TX_BY_SIGNATURE: Record<string, ParsedTransactionWithMeta> = {
    [DATA_SIGNATURES.transfer]: mockParsedTx([
        { parsed: { info: { lamports: 1_500_000_000 }, type: 'transfer' }, program: 'system', programId: SYSTEM_PROGRAM },
    ]),
    [DATA_SIGNATURES.mint]: mockParsedTx([
        { parsed: { info: {}, type: 'mintTo' }, program: 'spl-token', programId: PROGRAM_PUBKEY },
        { parsed: { info: {}, type: 'transfer' }, program: 'spl-token', programId: PROGRAM_PUBKEY },
    ]),
    [DATA_SIGNATURES.memo]: mockParsedTx([{ parsed: 'gm from the program-account slice', programId: MEMO_PROGRAM }]),
};

// --- Cluster state -------------------------------------------------------------

// Devnet: useSquadsMultisigLookup returns null without a real fetch (mainnet would
// actually query). The address-page program section relies on this behaviour.
const devnetClusterState: ClusterState = {
    cluster: Cluster.Devnet,
    clusterInfo: {
        epochInfo: {
            absoluteSlot: 312_456_789n,
            blockHeight: 295_456_321n,
            epoch: 520n,
            slotIndex: 156_789n,
            slotsInEpoch: 432_000n,
        },
        epochSchedule: {
            firstNormalEpoch: 14n,
            firstNormalSlot: 524_256n,
            slotsPerEpoch: 432_000n,
        },
        firstAvailableBlock: 0n,
        genesisHash: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
    },
    customUrl: DEVNET_URL,
    status: ClusterStatus.Connected,
};

// --- Provider wrappers ---------------------------------------------------------

/**
 * All providers the program-account page needs. `MockTokenInfoBatchProvider` is
 * required by the Address component; MockHistory/MockTransactions feed the History tab.
 */
export function MockProgramAccountProviders({
    children,
    history = MOCK_HISTORY,
    visibility = false,
}: {
    children: React.ReactNode;
    history?: typeof MOCK_HISTORY;
    /**
     * Wrap in a real `VisibilityProvider` so the per-row `useVisibility` hook flips to
     * visible and `useInstructionNames` actually fetches. Without it, every row's
     * instruction list is stuck on `InstructionListSkeleton` (the "always loading" state).
     */
    visibility?: boolean;
}) {
    const body = visibility ? <VisibilityProvider>{children}</VisibilityProvider> : children;
    return (
        <MockClusterProvider state={devnetClusterState}>
            <MockTokenInfoBatchProvider>
                <MockAccountsProvider>
                    <MockTransactionsProvider>
                        <MockHistoryProvider history={history}>{body}</MockHistoryProvider>
                    </MockTransactionsProvider>
                </MockAccountsProvider>
            </MockTokenInfoBatchProvider>
        </MockClusterProvider>
    );
}

export const withMockProviders: Decorator = Story => (
    <MockProgramAccountProviders>
        <Story />
    </MockProgramAccountProviders>
);

export const withEmptyHistoryProviders: Decorator = Story => (
    <MockProgramAccountProviders history={MOCK_HISTORY_EMPTY}>
        <Story />
    </MockProgramAccountProviders>
);

/**
 * Renders TransactionHistoryCard with resolved instruction data instead of skeletons:
 *  - `visibility` enables the per-row `useInstructionNames` fetch,
 *  - the `getParsedTransaction` stub returns mock parsed txs so instruction names resolve.
 * Overrides `Connection.prototype.getParsedTransaction` (which `withMockRpc` stubs to
 * undefined), so this must run after `withMockRpc` — place it later in the decorators array.
 */
export const withInstructionData: Decorator = Story => {
    Object.assign(Connection.prototype, {
        getParsedTransaction: async (signature: string) => MOCK_PARSED_TX_BY_SIGNATURE[signature] ?? null,
    });
    return (
        <MockProgramAccountProviders history={MOCK_HISTORY_WITH_DATA} visibility>
            <Story />
        </MockProgramAccountProviders>
    );
};

// UpgradeableLoaderAccountSection's useSquadsMultisigLookup throws a Suspense promise
// on first render (even on devnet, where it resolves to null without a real fetch).
export const withSuspense: Decorator = Story => (
    <React.Suspense fallback={<LoadingCard />}>
        <Story />
    </React.Suspense>
);

// Re-export so stories that render TransactionHistoryCard can stub Connection RPC.
export { withMockRpc } from '@storybook-config/responsive-decorators';

// =============================================================================
// Tab-content mock data — Security / Verified Build / Domains / Program Multisig
// Each is a card rendered under one of the address-page navigation tabs. The
// per-component stories render the exported presentational variant so the data
// is deterministic (no on-chain binary parsing / registry fetches).
// =============================================================================

// --- Security tab (ProgramSecurityTxtCard) -------------------------------------
// Neodyme security.txt embedded in program data. Shape: NeodymeSecurityTXT.
export const MOCK_SECURITY_TXT: NeodymeSecurityTXT = {
    acknowledgements: 'https://example-protocol.io/security/acknowledgements',
    auditors: 'OtterSec, Neodyme',
    contacts: 'email:security@example-protocol.io,telegram:exampleprotocol_security',
    encryption: 'https://example-protocol.io/pgp-key.txt',
    expiry: '2026-12-31',
    name: 'Example Protocol',
    policy: 'https://example-protocol.io/security-policy',
    preferred_languages: 'en',
    project_url: 'https://example-protocol.io',
    source_code: 'https://github.com/example-protocol/program',
    source_release: 'v1.4.2',
    source_revision: '9f2c1ab',
};

// --- Verified Build tab (BaseVerifiedBuildCard) --------------------------------
// Registry payload for a verified program (VerificationStatus.Verified).
export const MOCK_VERIFIED_BUILD: OsecRegistryInfo = {
    executable_hash: '7c9f2a1e5b8d4c3f6a0e9d2b1c4f8a7e3d6b5c9f2a1e5b8d4c3f6a0e9d2b1c4f',
    is_verified: true,
    last_verified_at: '2026-05-14T09:32:00Z',
    message: 'Successfully verified',
    on_chain_hash: '7c9f2a1e5b8d4c3f6a0e9d2b1c4f8a7e3d6b5c9f2a1e5b8d4c3f6a0e9d2b1c4f',
    onchain_repo_url: 'https://github.com/example-protocol/program/tree/9f2c1ab',
    repo_url: 'https://github.com/example-protocol/program',
    signer: '9VWiUUhgNoRwTH5NVehYJEDwcotwYX3VgW4MChiHPAqU',
    verification_status: VerificationStatus.Verified,
    verify_command:
        'solana-verify verify-from-repo -um --program-id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA https://github.com/example-protocol/program',
};

// --- Domains tab (BaseDomainsCard) ---------------------------------------------
// Owned SNS + ANS domain names. Shape: DomainInfo[] (name + name-service account).
export const MOCK_DOMAINS: DomainInfo[] = [
    { address: 'Cg7kkVEUb4h6Qc5J9y5nJ6jJ8g2Yz7q1vX3m2nQ9pRk', name: 'example.sol' },
    { address: 'BmVo7dExtjBRnhkY2VUt5RJ8aB1sZ9hVn3kQpL4mNc2X', name: 'protocol.sol' },
    { address: 'D9kY3nQ8vRt2mJ7pXcZ1aB5sN6hVwL4qKfEgU2dTr8Y', name: 'treasury.abc' },
];

// --- Program Multisig tab (ProgramMultisigCard) --------------------------------
// The card reads two `useSWRImmutable` caches (squads reverse-map lookup + the
// multisig account). We seed both via SWRConfig `fallback` so the fetchers never
// run and the card renders a fully-populated Squads V4 multisig. Keys must match
// the component's cluster (Devnet, from MockClusterProvider) and the program
// authority (MOCK_PROGRAM_DATA.authority = AUTHORITY_PUBKEY).
const MULTISIG_ACCOUNT = new PublicKey('Vote111111111111111111111111111111111111111');
const MULTISIG_MEMBERS = [
    new PublicKey('SysvarC1ock11111111111111111111111111111111'),
    new PublicKey('SysvarS1otHashes111111111111111111111111111'),
    new PublicKey('Stake11111111111111111111111111111111111111'),
];

const squadsLookupKey = unstable_serialize(['squadsReverseMap', AUTHORITY_PUBKEY.toString(), Cluster.Devnet]);
const squadsMultisigKey = unstable_serialize(['squadsMultisig', MULTISIG_ACCOUNT.toString(), Cluster.Devnet]);

const MULTISIG_SWR_FALLBACK = {
    [squadsLookupKey]: { isSquad: true, multisig: MULTISIG_ACCOUNT.toString(), version: 'v4' },
    [squadsMultisigKey]: {
        multisig: { members: MULTISIG_MEMBERS.map(key => ({ key })), threshold: 2 },
        version: 'v4',
    },
};

// Args for ProgramMultisigCard — it reads `data.programData?.authority`.
export const MOCK_MULTISIG_ARGS = { data: MOCK_PARSED_DATA };

/**
 * Renders ProgramMultisigCard with a fully-populated Squads V4 multisig by seeding
 * the two squads SWR caches. Includes the standard page providers (Address needs
 * MockTokenInfoBatchProvider + cluster) and stubs Connection RPC so the incidental
 * anchor-IDL fetch resolves to nothing instead of hitting a real RPC.
 */
export const withMultisigData: Decorator = Story => {
    Object.assign(Connection.prototype, { getAccountInfo: async () => undefined });
    return (
        <SWRConfig value={{ fallback: MULTISIG_SWR_FALLBACK }}>
            <MockProgramAccountProviders>
                <Story />
            </MockProgramAccountProviders>
        </SWRConfig>
    );
};
