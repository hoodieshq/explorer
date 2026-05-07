// Reuse note: production address dispatch happens in `app/address/[address]/layout.tsx`.
// This list is intentionally hand-curated for isolated testing of thumbnail rendering.
//
// Top-level grouping mirrors the four base account categories on Solana:
//   - program: executable accounts owned by a loader (BPF Upgradeable Loader, etc.)
//   - data: non-executable state owned by some on-chain program
//   - system: owned by the System Program (plain wallets holding SOL)
//   - sysvar: special runtime accounts (Clock, Rent, …)
//
// Some entries are marked TODO — replace with addresses you've verified exist on
// mainnet for the type you're testing.

export type AccountThumbnailCategory = 'program' | 'data' | 'system' | 'sysvar';

export type AccountThumbnailType =
    | 'spl-token-mint'
    | 'upgradeable-program'
    | 'stake'
    | 'vote'
    | 'nonce'
    | 'sysvar'
    | 'config'
    | 'address-lookup-table'
    | 'system-wallet';

// Sub-program grouping used to render a deeper tree level under each category.
// Each example references one of these by id; the index view groups items by
// subgroup beneath their category header.
export type AccountThumbnailSubgroupId =
    | 'upgradeable-loader'
    | 'legacy-bpf-loader'
    | 'loader-v4'
    | 'native-loader'
    | 'spl-token'
    | 'spl-token-2022'
    | 'stake-program'
    | 'vote-program'
    | 'nonce-program'
    | 'config-program'
    | 'address-lookup-table'
    | 'other-programs'
    | 'system-program'
    | 'sysvar';

// Per-subgroup type coverage. Either a finite set of expected sub-types
// (parsed `type` values from the RPC, e.g. `mint` / `account` / `multisig` for
// SPL Token), or `endless` when the population is open-ended (every wallet on
// the network, every spl-token mint ever created, …).
export type SubgroupCoverage = { kind: 'finite'; subtypes: readonly string[] } | { kind: 'endless' };

// Note: insertion order of this Record drives display order in the tree
// (`buildTree` enumerates subgroups in this order, even those with no examples),
// so it is intentionally NOT sorted alphabetically.
/* eslint-disable sort-keys-fix/sort-keys-fix */
export const ACCOUNT_THUMBNAIL_SUBGROUPS: Record<
    AccountThumbnailSubgroupId,
    { label: string; category: AccountThumbnailCategory; coverage: SubgroupCoverage }
> = {
    'upgradeable-loader': {
        category: 'program',
        coverage: { kind: 'finite', subtypes: ['program', 'programData', 'buffer', 'uninitialized'] },
        label: 'BPF Upgradeable Loader',
    },
    'legacy-bpf-loader': {
        // Deprecated non-upgradeable loader (`BPFLoader2111…`). Programs deployed
        // via this loader store bytecode directly in the program account; no
        // separate programData/buffer surface, so just one parsed sub-type.
        category: 'program',
        coverage: { kind: 'finite', subtypes: ['program'] },
        label: 'BPF Loader (legacy)',
    },
    'loader-v4': {
        category: 'program',
        coverage: { kind: 'finite', subtypes: ['program'] },
        label: 'Loader v4',
    },
    'native-loader': {
        // Owner of native programs (System, Vote, Stake, Config, …). No bytecode
        // — the loader just maps the program ID to a built-in implementation.
        category: 'program',
        coverage: { kind: 'finite', subtypes: ['program'] },
        label: 'Native Loader',
    },
    'spl-token': {
        category: 'data',
        coverage: { kind: 'finite', subtypes: ['mint', 'account', 'multisig'] },
        label: 'SPL Token',
    },
    'spl-token-2022': {
        // Distinct on-chain program from spl-token (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)
        // with the same parsed sub-types but its own extension surface.
        category: 'data',
        coverage: { kind: 'finite', subtypes: ['mint', 'account', 'multisig'] },
        label: 'SPL Token-2022',
    },
    'stake-program': {
        category: 'data',
        coverage: { kind: 'finite', subtypes: ['uninitialized', 'initialized', 'delegated', 'rewardsPool'] },
        label: 'Stake program',
    },
    'vote-program': {
        category: 'data',
        coverage: { kind: 'finite', subtypes: ['vote'] },
        label: 'Vote program',
    },
    'nonce-program': {
        category: 'data',
        coverage: { kind: 'finite', subtypes: ['initialized', 'uninitialized'] },
        label: 'Nonce program',
    },
    'config-program': {
        category: 'data',
        coverage: { kind: 'finite', subtypes: ['stakeConfig', 'validatorInfo'] },
        label: 'Config program',
    },
    'address-lookup-table': {
        category: 'data',
        coverage: { kind: 'finite', subtypes: ['lookupTable', 'uninitialized'] },
        label: 'Address Lookup Table',
    },
    'other-programs': {
        // Catch-all for the (effectively unbounded) population of program-owned
        // data accounts that aren't natively parsed by RPC: Anchor accounts,
        // SPL Governance, Stake Pool, Squads, Pyth/Switchboard, NFToken, etc.
        category: 'data',
        coverage: { kind: 'endless' },
        label: 'Other on-chain programs',
    },
    'system-program': {
        // Every wallet on Solana is a system-owned account; enumerating types is meaningless.
        category: 'system',
        coverage: { kind: 'endless' },
        label: 'System Program',
    },
    sysvar: {
        category: 'sysvar',
        coverage: {
            kind: 'finite',
            subtypes: [
                'clock',
                'epochSchedule',
                'fees',
                'recentBlockhashes',
                'rent',
                'rewards',
                'slotHashes',
                'slotHistory',
                'stakeHistory',
            ],
        },
        label: 'Sysvar program',
    },
};
/* eslint-enable sort-keys-fix/sort-keys-fix */

export type AccountThumbnailExample = {
    address: string;
    label: string;
    category: AccountThumbnailCategory;
    subgroup: AccountThumbnailSubgroupId;
    type: AccountThumbnailType;
    // Canonical sub-type id within the subgroup (matches one of the values in
    // `ACCOUNT_THUMBNAIL_SUBGROUPS[subgroup].coverage.subtypes` when finite).
    // For endless subgroups it's still set, just not used for coverage math.
    subtype: string;
    note?: string;
    // `false` means the address is a placeholder that hasn't been verified to
    // exist / match the claimed type on mainnet. Surfaced as a status indicator
    // in the index view.
    verified: boolean;
    // Marks the program/sysvar as deprecated by the runtime — still reachable
    // on-chain but no longer recommended for use.
    deprecated?: boolean;
    // Marks a sub-type that exists on Solana but isn't worth rendering in the
    // playground (transient, rare, or otherwise low-value). The row stays
    // visible as documentation but is non-interactive and address can be empty.
    // Still counts toward coverage so the subgroup can read as "complete".
    skipped?: boolean;
};

// Coverage summary: how many of the expected sub-types in a subgroup are
// actually represented by examples. Endless subgroups report `kind: 'endless'`.
export type SubgroupCoverageStatus =
    | { kind: 'finite'; covered: number; total: number; missing: readonly string[] }
    | { kind: 'endless'; representatives: number };

export function getSubgroupCoverage(
    subgroupId: AccountThumbnailSubgroupId,
    items: readonly AccountThumbnailExample[],
): SubgroupCoverageStatus {
    const { coverage } = ACCOUNT_THUMBNAIL_SUBGROUPS[subgroupId];
    if (coverage.kind === 'endless') {
        return { kind: 'endless', representatives: items.length };
    }
    const present = new Set(items.map(item => item.subtype));
    const missing = coverage.subtypes.filter(subtype => !present.has(subtype));
    return {
        covered: coverage.subtypes.length - missing.length,
        kind: 'finite',
        missing,
        total: coverage.subtypes.length,
    };
}

export const ACCOUNT_THUMBNAIL_CATEGORIES: { id: AccountThumbnailCategory; label: string; blurb: string }[] = [
    { blurb: 'Executable accounts owned by a loader.', id: 'program', label: 'Program accounts' },
    { blurb: 'Non-executable state owned by an on-chain program.', id: 'data', label: 'Data accounts' },
    { blurb: 'Owned by the System Program — plain wallets holding SOL.', id: 'system', label: 'System accounts' },
    { blurb: 'Special runtime accounts maintained by the validator.', id: 'sysvar', label: 'Sysvar accounts' },
];

export const ACCOUNT_THUMBNAIL_EXAMPLES: AccountThumbnailExample[] = [
    {
        address: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        category: 'program',
        label: 'Token Metadata',
        note: 'program',
        subgroup: 'upgradeable-loader',
        subtype: 'program',
        type: 'upgradeable-program',
        verified: true,
    },
    {
        // Token Metadata programData PDA — derived from the program above via
        //   findProgramAddress(['ProgramData', programId], BPFLoaderUpgradeab1e11111111111111111111111)
        // Confirmed via `solana program show metaqbxxUerd... -u mainnet-beta`.
        address: 'PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT',
        category: 'program',
        label: 'Token Metadata · programData',
        note: 'programData',
        subgroup: 'upgradeable-loader',
        subtype: 'programData',
        type: 'upgradeable-program',
        verified: true,
    },
    {
        // Transient — created during `solana program write-buffer` and closed
        // once an upgrade lands. Not worth a thumbnail; listed for completeness.
        address: '',
        category: 'program',
        label: 'Upgrade buffer',
        note: 'buffer',
        skipped: true,
        subgroup: 'upgradeable-loader',
        subtype: 'buffer',
        type: 'upgradeable-program',
        verified: false,
    },
    {
        // Almost never persisted on mainnet — exists briefly mid-deploy.
        address: '',
        category: 'program',
        label: 'Uninitialized loader',
        note: 'uninitialized',
        skipped: true,
        subgroup: 'upgradeable-loader',
        subtype: 'uninitialized',
        type: 'upgradeable-program',
        verified: false,
    },
    {
        // SPL Token program — deployed via the legacy non-upgradeable BPF loader.
        address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        category: 'program',
        label: 'SPL Token (program)',
        note: 'program',
        subgroup: 'legacy-bpf-loader',
        subtype: 'program',
        type: 'upgradeable-program',
        verified: true,
    },
    {
        // TODO: replace with a verified Loader-v4-deployed program.
        address: '',
        category: 'program',
        label: 'Loader v4 program',
        note: 'program',
        skipped: true,
        subgroup: 'loader-v4',
        subtype: 'program',
        type: 'upgradeable-program',
        verified: false,
    },
    {
        // System Program — native, owned by the Native Loader.
        address: '11111111111111111111111111111111',
        category: 'program',
        label: 'System Program',
        note: 'program',
        subgroup: 'native-loader',
        subtype: 'program',
        type: 'upgradeable-program',
        verified: true,
    },
    {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        category: 'data',
        label: 'USDC',
        note: 'mint',
        subgroup: 'spl-token',
        subtype: 'mint',
        type: 'spl-token-mint',
        verified: true,
    },
    {
        // Binance hot wallet's USDC ATA. Derived via:
        //   findProgramAddress([owner, TOKEN_PROGRAM_ID, USDC_MINT], ATA_PROGRAM_ID)
        // Confirmed via `solana account ... -u mainnet-beta`.
        address: 'FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B',
        category: 'data',
        label: 'Binance · USDC ATA',
        note: 'account',
        subgroup: 'spl-token',
        subtype: 'account',
        type: 'spl-token-mint',
        verified: true,
    },
    {
        // Multisigs are a rare on-chain construct; not a high-value thumbnail.
        address: '',
        category: 'data',
        label: 'Token multisig',
        note: 'multisig',
        skipped: true,
        subgroup: 'spl-token',
        subtype: 'multisig',
        type: 'spl-token-mint',
        verified: false,
    },
    {
        // PYUSD on Solana — Token-2022 native. Confirmed via
        //   `solana account 2b1kV6DkPA... -u mainnet-beta` → owner = TokenzQdB...
        address: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
        category: 'data',
        label: 'PYUSD',
        note: 'mint',
        subgroup: 'spl-token-2022',
        subtype: 'mint',
        type: 'spl-token-mint',
        verified: true,
    },
    {
        // Largest PYUSD holder (~363M PYUSD; likely Paxos treasury). Found via
        //   getTokenLargestAccounts(PYUSD_MINT). Owner = Token-2022 program.
        address: '47od2TPRvqJipfPVWZdyenLEngPw8hC36nDxiLyvGsEP',
        category: 'data',
        label: 'PYUSD top holder',
        note: 'account',
        subgroup: 'spl-token-2022',
        subtype: 'account',
        type: 'spl-token-mint',
        verified: true,
    },
    {
        address: '',
        category: 'data',
        label: 'Token-2022 multisig',
        note: 'multisig',
        skipped: true,
        subgroup: 'spl-token-2022',
        subtype: 'multisig',
        type: 'spl-token-mint',
        verified: false,
    },
    {
        // Delegated stake account (~2.66 SOL). Found via
        //   getProgramAccountsV2(Stake11..., dataSize=200, memcmp[0:state=2])
        // and confirmed: 200-byte StakeStateV2 with leading `02 00 00 00`.
        address: '118GK7bmNwcb9A7VM1gcuQJGaDDigKddk3U7H24dX2X',
        category: 'data',
        label: 'Stake',
        note: 'delegated',
        subgroup: 'stake-program',
        subtype: 'delegated',
        type: 'stake',
        verified: true,
    },
    {
        // Pre-delegation state — uncommon on mainnet (most stakes are delegated immediately).
        address: '',
        category: 'data',
        label: 'Stake (initialized)',
        note: 'initialized',
        skipped: true,
        subgroup: 'stake-program',
        subtype: 'initialized',
        type: 'stake',
        verified: false,
    },
    {
        // Transient — only exists between account creation and stake init.
        address: '',
        category: 'data',
        label: 'Stake (uninitialized)',
        note: 'uninitialized',
        skipped: true,
        subgroup: 'stake-program',
        subtype: 'uninitialized',
        type: 'stake',
        verified: false,
    },
    {
        // Legacy — rewards pool was deprecated by the runtime.
        address: '',
        category: 'data',
        deprecated: true,
        label: 'Stake (rewardsPool)',
        note: 'rewardsPool',
        skipped: true,
        subgroup: 'stake-program',
        subtype: 'rewardsPool',
        type: 'stake',
        verified: false,
    },
    {
        // Certus One validator vote account. Confirmed via
        //   `solana account CertusDeBmq... -u mainnet-beta` → owner = Vote111…
        address: 'CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu',
        category: 'data',
        label: 'Vote · Certus One',
        note: 'vote',
        subgroup: 'vote-program',
        subtype: 'vote',
        type: 'vote',
        verified: true,
    },
    {
        // Initialized durable nonce account. Found via
        //   getProgramAccountsV2(System11..., dataSize=80)
        // and confirmed via jsonParsed → { program: 'nonce', type: 'initialized' }.
        address: '11NG53p1NEabyAP32BLAMsRYxR9u8DokovbaASaajK',
        category: 'data',
        label: 'Nonce',
        note: 'initialized',
        subgroup: 'nonce-program',
        subtype: 'initialized',
        type: 'nonce',
        verified: true,
    },
    {
        // Transient — exists between account creation and nonce init.
        address: '',
        category: 'data',
        label: 'Nonce (uninitialized)',
        note: 'uninitialized',
        skipped: true,
        subgroup: 'nonce-program',
        subtype: 'uninitialized',
        type: 'nonce',
        verified: false,
    },
    {
        address: 'StakeConfig11111111111111111111111111111111',
        category: 'data',
        label: 'Stake config',
        note: 'stakeConfig',
        subgroup: 'config-program',
        subtype: 'stakeConfig',
        type: 'config',
        verified: true,
    },
    {
        // MAS DeFi validator-info config account. Found via
        //   `solana validator-info get -u mainnet-beta`
        // and confirmed jsonParsed → { program: 'config', type: 'validatorInfo' }.
        address: '2crogkj8kecEjH8RGbLXDLyinZ1GcryobWHktDMvm69t',
        category: 'data',
        label: 'Validator info · MAS DeFi',
        note: 'validatorInfo',
        subgroup: 'config-program',
        subtype: 'validatorInfo',
        type: 'config',
        verified: true,
    },
    {
        // Verified existing ALT on mainnet — owner = AddressLookupTab1e..., parsed
        // type = 'lookupTable' with a populated addresses[] array.
        address: '4sKLJ1Qoudh8PJyqBeuKocYdsZvxTcRShUt9aKqwhgvC',
        category: 'data',
        label: 'Lookup table',
        note: 'lookupTable',
        subgroup: 'address-lookup-table',
        subtype: 'lookupTable',
        type: 'address-lookup-table',
        verified: true,
    },
    {
        // Transient — exists briefly between account creation and ALT init.
        address: '',
        category: 'data',
        label: 'Lookup table (uninitialized)',
        note: 'uninitialized',
        skipped: true,
        subgroup: 'address-lookup-table',
        subtype: 'uninitialized',
        type: 'address-lookup-table',
        verified: false,
    },
    {
        // Pyth SOL/USD price account — owner is the Pyth oracle program
        // (`FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH`). Not natively parsed
        // by RPC, so renders via the raw thumbnail.
        address: 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
        category: 'data',
        label: 'Pyth SOL/USD',
        note: 'pyth oracle',
        subgroup: 'other-programs',
        subtype: 'pyth-price',
        type: 'system-wallet',
        verified: true,
    },
    {
        // Binance hot wallet — system-owned, holds SOL. Source: solscan.io.
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        category: 'system',
        label: 'Binance hot wallet',
        note: 'system-owned',
        subgroup: 'system-program',
        subtype: 'wallet',
        type: 'system-wallet',
        verified: true,
    },
    {
        address: 'HxxVw4JQYgqxUGRruAzTj4Nrisc2e3qr9azVn7fVtnSo',
        category: 'system',
        label: 'Random wallet',
        note: 'system-owned',
        subgroup: 'system-program',
        subtype: 'wallet',
        type: 'system-wallet',
        verified: true,
    },
    {
        address: 'SysvarC1ock11111111111111111111111111111111',
        category: 'sysvar',
        label: 'Clock',
        note: 'clock',
        subgroup: 'sysvar',
        subtype: 'clock',
        type: 'sysvar',
        verified: true,
    },
    {
        address: 'SysvarEpochSchedu1e111111111111111111111111',
        category: 'sysvar',
        label: 'Epoch schedule',
        note: 'epochSchedule',
        subgroup: 'sysvar',
        subtype: 'epochSchedule',
        type: 'sysvar',
        verified: true,
    },
    {
        address: 'SysvarRent111111111111111111111111111111111',
        category: 'sysvar',
        label: 'Rent',
        note: 'rent',
        subgroup: 'sysvar',
        subtype: 'rent',
        type: 'sysvar',
        verified: true,
    },
    {
        address: 'SysvarRewards111111111111111111111111111111',
        category: 'sysvar',
        label: 'Rewards',
        note: 'rewards',
        subgroup: 'sysvar',
        subtype: 'rewards',
        type: 'sysvar',
        verified: true,
    },
    {
        // Deprecated in Solana 1.9+ but the account still exists on mainnet.
        address: 'SysvarFees111111111111111111111111111111111',
        category: 'sysvar',
        deprecated: true,
        label: 'Fees',
        note: 'fees',
        subgroup: 'sysvar',
        subtype: 'fees',
        type: 'sysvar',
        verified: true,
    },
    {
        // Deprecated but address still exists.
        address: 'SysvarRecentB1ockHashes11111111111111111111',
        category: 'sysvar',
        deprecated: true,
        label: 'Recent blockhashes',
        note: 'recentBlockhashes',
        subgroup: 'sysvar',
        subtype: 'recentBlockhashes',
        type: 'sysvar',
        verified: true,
    },
    {
        address: 'SysvarS1otHashes111111111111111111111111111',
        category: 'sysvar',
        label: 'Slot hashes',
        note: 'slotHashes',
        subgroup: 'sysvar',
        subtype: 'slotHashes',
        type: 'sysvar',
        verified: true,
    },
    {
        address: 'SysvarS1otHistory11111111111111111111111111',
        category: 'sysvar',
        label: 'Slot history',
        note: 'slotHistory',
        subgroup: 'sysvar',
        subtype: 'slotHistory',
        type: 'sysvar',
        verified: true,
    },
    {
        address: 'SysvarStakeHistory1111111111111111111111111',
        category: 'sysvar',
        label: 'Stake history',
        note: 'stakeHistory',
        subgroup: 'sysvar',
        subtype: 'stakeHistory',
        type: 'sysvar',
        verified: true,
    },
];
