import { FetchStatus } from '@providers/cache';
import { VersionedMessage } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { ClusterStatus } from '@utils/cluster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createV0LookupTableTransactionBytes,
    createV1TransactionBytes,
    createWeb3TransactionBytes,
} from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import { Logger } from '@/app/shared/lib/logger';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

import { PermalinkView } from '../InspectorPage';

const fetchTransaction = vi.fn();
let cacheEntry: ReturnType<typeof makeEntry> | undefined;
let clusterStatus: ClusterStatus = ClusterStatus.Connected;

vi.mock('@providers/transactions/raw', () => ({
    useFetchRawTransaction: () => fetchTransaction,
    useRawTransactionDetails: () => cacheEntry,
}));
// PermalinkView gates its fetch on the cluster being connected; drive that status per test.
vi.mock('@/app/providers/cluster', () => ({
    useCluster: () => ({ status: clusterStatus }),
}));
vi.mock('next/navigation', () => import('@/app/__tests__/next-navigation'));
// The v1 tests render LoadedView; stub its data-fetching children so the overview card —
// the part under test — renders without providers.
vi.mock('@providers/accounts', () => ({
    useFetchAccountInfo: () => vi.fn(),
}));
// LoadedView owns the simulation and builds a Connection eagerly; stub the hook so these overview-only
// tests don't need a live cluster URL. Idle status keeps the token-balance rows and gated tabs off.
vi.mock('@/app/features/instruction-simulation/model/use-simulation', () => ({
    useSimulation: () => ({ simulate: vi.fn(), status: 'idle' }),
}));
vi.mock('../AccountsCard', () => ({
    AccountsCard: () => <div data-testid="accounts-card" />,
}));
vi.mock('../AddressTableLookupsCard', () => ({
    AddressTableLookupsCard: () => <div data-testid="atl-card" />,
}));
vi.mock('../InstructionsSection', () => ({
    InstructionsSection: () => <div data-testid="instructions-section" />,
}));
vi.mock('../SignaturesCard', () => ({
    TransactionSignatures: () => <div data-testid="signatures-card" />,
}));
vi.mock('../AddressWithContext', () => ({
    AddressWithContext: () => <div />,
    createFeePayerValidator: () => () => undefined,
}));

// Minimal stand-in for a decoded raw tx; only the fields PermalinkView reads.
function makeEntry(raw: unknown, status = FetchStatus.Fetched) {
    return { data: { raw }, status };
}

beforeEach(() => {
    fetchTransaction.mockReset();
    cacheEntry = undefined;
    clusterStatus = ClusterStatus.Connected;
});
afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

const props = { reset: () => {}, showTokenBalanceChanges: false, signature: 'sig' };
const renderView = () => render(<PermalinkView {...props} />);

function entry(wireBytes: Uint8Array) {
    const { messageBytes } = parseTransactionBytes(wireBytes);
    const message = VersionedMessage.deserialize(messageBytes);
    return makeEntry({ message, messageBytes, signatures: [], version: message.version });
}

function rowValue(label: string): string | null | undefined {
    return screen.getByText(label).nextElementSibling?.textContent;
}

describe('PermalinkView', () => {
    it('should fetch at confirmed commitment on mount', () => {
        renderView();
        expect(fetchTransaction).toHaveBeenCalledWith('sig', 'confirmed');
    });

    it('should not fetch until the cluster is connected', () => {
        // Guards against fetching before the ?cluster= param settles, which would hit the default cluster.
        clusterStatus = ClusterStatus.Connecting;
        renderView();
        expect(fetchTransaction).not.toHaveBeenCalled();
    });

    it('should show "Transaction was not found" when the fetch returns no transaction', () => {
        cacheEntry = makeEntry(null); // Fetched, raw == null
        renderView();
        expect(screen.getByText('Transaction was not found')).toBeInTheDocument();
    });

    it('should show "Failed to fetch transaction" on FetchFailed', () => {
        cacheEntry = makeEntry(undefined, FetchStatus.FetchFailed);
        renderView();
        expect(screen.getByText('Failed to fetch transaction')).toBeInTheDocument();
    });

    it('should render a v1 transaction with its resource-limit rows', () => {
        cacheEntry = entry(createV1TransactionBytes({ computeUnitLimit: 300_000, priorityFeeLamports: 50n }));

        renderView();

        expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.getByText('Compute unit limit')).toBeInTheDocument();
        expect(screen.getByText('300,000')).toBeInTheDocument();
        expect(screen.getByText('Priority fee (total)')).toBeInTheDocument();
        expect(screen.getByTestId('instructions-section')).toBeInTheDocument();
        // v1 messages carry static accounts only, so the lookups card is not rendered.
        expect(screen.queryByTestId('atl-card')).not.toBeInTheDocument();
    });

    it('should keep the version row and hide the resource-limit rows when the v1 message fails to parse', () => {
        const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
        const { messageBytes } = parseTransactionBytes(createV1TransactionBytes({ computeUnitLimit: 300_000 }));
        messageBytes[2] = 1;
        cacheEntry = makeEntry({
            message: VersionedMessage.deserialize(messageBytes),
            messageBytes,
            signatures: [],
            version: 1,
        });

        renderView();

        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.queryByText('Compute unit limit')).not.toBeInTheDocument();
        expect(warn).toHaveBeenCalledWith('[inspector] Failed to read v1 resource limits', {
            cause: expect.any(Error),
        });
    });

    it.each([
        { version: 'legacy', wireBytes: createWeb3TransactionBytes('legacy') },
        { version: 'v0', wireBytes: createWeb3TransactionBytes(0) },
        { version: 'v1', wireBytes: createV1TransactionBytes({}) },
    ])('should show the $version transaction version', ({ version, wireBytes }) => {
        cacheEntry = entry(wireBytes);

        renderView();

        expect(rowValue('Transaction Version')).toBe(version);
    });

    it.each([
        { limit: 1232, version: 'legacy', wireBytes: createWeb3TransactionBytes('legacy') },
        { limit: 1232, version: 'v0', wireBytes: createWeb3TransactionBytes(0) },
        { limit: 4096, version: 'v1', wireBytes: createV1TransactionBytes({}) },
    ])('should report the wire size against the $version size limit', ({ limit, wireBytes }) => {
        cacheEntry = entry(wireBytes);

        renderView();

        expect(screen.getByText(`${wireBytes.length} / ${limit} bytes`)).toBeInTheDocument();
    });
});
