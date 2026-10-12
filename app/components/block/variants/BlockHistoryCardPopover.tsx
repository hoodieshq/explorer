// REVIEW(HOO-1823): a copy of BlockHistoryCard for the Popover filtering variant; remove before the external PR,
// keeping the variant the team picks.
import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { Signature } from '@components/common/Signature';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';
import {
    BLOCK_TRANSACTION_VERSIONS,
    type BlockData,
    type BlockTransactionMeta,
    getBlockTransactionAccounts,
    getBlockTransactionInstructions,
    isBlockTransaction,
} from '@entities/block-data';
import { estimateRequestedComputeUnits } from '@entities/compute-unit';
import {
    type HistoryStatus,
    isHistoryStatus,
    STATUS_LABELS,
    STATUS_PARAM,
    STATUS_VALUES,
} from '@features/transaction-history/lib/history-filters';
import { useCluster } from '@providers/cluster';
import {
    type Address as KitAddress,
    address,
    type Signature as KitSignature,
    type TransactionVersion,
} from '@solana/kit';
import { parseProgramLogs } from '@utils/program-logs';
import { displayAddress } from '@utils/tx';
import Link from 'next/link';
import { ReadonlyURLSearchParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'react-feather';

import {
    DEFAULT_DIRECTION,
    isSortMode,
    nextSortParams,
    type SortDirection,
    type SortMode,
    sortTransactions,
} from '@/app/components/block/block-history-sort';
import { LoadMoreButton, type ResponsiveCell, ResponsiveGridRow } from '@/app/components/block/shared';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import { invariant } from '@/app/shared/lib/invariant';
import { DataListCard } from '@/app/shared/ui/DataListCard';
import { BaseFilterSection, BaseToggleChips, FilterListbox } from '@/app/shared/ui/filters';
import { ROW_PADDING } from '@/app/shared/ui/spacing';

const PAGE_SIZE = 25;
const VOTE_PROGRAM_ADDRESS = address('Vote111111111111111111111111111111111111111');

const useQueryProgramFilter = (query: ReadonlyURLSearchParams): string => {
    const filter = query.get('filter');
    return filter || '';
};

const useQueryAccountFilter = (query: ReadonlyURLSearchParams): KitAddress | undefined => {
    const filter = query.get('accountFilter');
    if (filter !== null) {
        try {
            return address(filter);
        } catch {
            /* empty */
        }
    }
    return undefined;
};

// The chips pick several values at once, so `status` and `version` hold a comma-separated list. Picking every
// value stays in the URL as is, so the chips still show all of them picked, but it filters nothing.
const useQueryVersionSelection = (query: ReadonlyURLSearchParams): TransactionVersion[] => {
    const picked = new Set(query.get(VERSION_PARAM)?.split(',') ?? []);
    return BLOCK_TRANSACTION_VERSIONS.filter(({ version }) => picked.has(versionParam(version))).map(
        ({ version }) => version,
    );
};

const useQueryStatusSelection = (query: ReadonlyURLSearchParams): HistoryStatus[] => {
    const picked = (query.get(STATUS_PARAM)?.split(',') ?? []).filter(isHistoryStatus);
    return STATUS_VALUES.filter(status => picked.includes(status));
};

const useQuerySort = (query: ReadonlyURLSearchParams): { mode: SortMode; direction: SortDirection } => {
    const sort = query.get('sort');
    const mode: SortMode = isSortMode(sort) ? sort : 'index';
    const dir = query.get('dir');
    const direction: SortDirection = dir === 'asc' || dir === 'desc' ? dir : DEFAULT_DIRECTION[mode];
    return { direction, mode };
};

type TransactionWithInvocations = {
    index: number;
    signature?: KitSignature;
    meta: BlockTransactionMeta | null;
    invocations: Map<string, number>;
    computeUnits?: number;
    costUnits?: bigint;
    reservedComputeUnits?: number;
    logTruncated: boolean;
    unavailable: boolean;
    version?: TransactionVersion;
};

export function BlockHistoryCardPopover({ block, epoch }: { block: BlockData; epoch: bigint | undefined }) {
    const [numDisplayed, setNumDisplayed] = React.useState(PAGE_SIZE);
    const currentPathname = usePathname();
    const currentSearchParams = useSearchParams();
    const programFilter = useQueryProgramFilter(currentSearchParams);
    const accountFilter = useQueryAccountFilter(currentSearchParams);
    const versionSelection = useQueryVersionSelection(currentSearchParams);
    const statusSelection = useQueryStatusSelection(currentSearchParams);
    // Neither or every value picked is no filter at all.
    const versionFilter =
        versionSelection.length === 0 || versionSelection.length === BLOCK_TRANSACTION_VERSIONS.length
            ? undefined
            : versionSelection;
    const statusFilter = statusSelection.length === 1 ? statusSelection[0] : undefined;
    const { direction: sortDirection, mode: sortMode } = useQuerySort(currentSearchParams);
    const router = useRouter();
    const { cluster } = useCluster();

    // Sort is driven by URL params (`sort` + `dir`); the grid's sortable headers push through here.
    // Clicking the active column flips its direction; clicking another column selects it at its natural
    // default direction. The mobile sort menu passes an explicit direction (its rows are per-direction),
    // which skips the toggle. `index` ascending is the default view, so it's written as a clean URL with
    // no sort params. We copy the current params so a `delete` drops the keys while other params survive.
    const pushSort = React.useCallback(
        (sortKey: SortMode, explicitDirection?: SortDirection) => {
            const nextParams = nextSortParams(
                new URLSearchParams(currentSearchParams?.toString()),
                sortKey,
                sortMode,
                sortDirection,
                explicitDirection,
            );
            const queryString = nextParams.toString();
            router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
        },
        [currentPathname, currentSearchParams, router, sortMode, sortDirection],
    );

    const { transactions, invokedPrograms } = React.useMemo(() => {
        const invokedPrograms = new Map<string, number>();

        const transactions: TransactionWithInvocations[] = block.transactions.map(entry => {
            if (!isBlockTransaction(entry)) {
                return {
                    index: entry.index,
                    invocations: new Map(),
                    logTruncated: false,
                    // eslint-disable-next-line unicorn/no-null -- sortTransactions types `meta` as nullable, matching the RPC shape
                    meta: null,
                    unavailable: true,
                };
            }

            const tx = entry;
            const signature = tx.signatures[0];

            const programIndexes = getBlockTransactionInstructions(tx.message)
                .map(ix => ix.programAddressIndex)
                .concat(
                    tx.meta?.innerInstructions?.flatMap(ix => {
                        return ix.instructions.map(ix => ix.programIdIndex);
                    }) || [],
                );

            const indexMap = new Map<number, number>();
            programIndexes.forEach(programIndex => {
                const count = indexMap.get(programIndex) || 0;
                indexMap.set(programIndex, count + 1);
            });

            const invocations = new Map<string, number>();
            const accountKeys = getBlockTransactionAccounts(tx);
            indexMap.forEach((count, i) => {
                const accountKey = accountKeys[i];
                invariant(accountKey, `account key index ${i} out of range`);
                const programId = accountKey;
                invocations.set(programId, count);
                const programTransactionCount = invokedPrograms.get(programId) || 0;
                invokedPrograms.set(programId, programTransactionCount + 1);
            });

            let logTruncated = false;
            let computeUnits: number | undefined = undefined;
            try {
                const parsedLogs = parseProgramLogs(tx.meta?.logMessages ?? [], tx.meta?.err, cluster);

                logTruncated = parsedLogs[parsedLogs.length - 1].truncated;
                computeUnits = parsedLogs.map(({ computeUnits }) => computeUnits).reduce((sum, next) => sum + next);
            } catch (_err) {
                // ignore parsing errors because some old logs aren't parsable
            }

            const costUnits = tx.meta?.costUnits;

            // Calculate reserved compute units
            const reservedComputeUnits = estimateRequestedComputeUnits(tx, epoch, cluster);

            return {
                computeUnits,
                costUnits,
                index: tx.index,
                invocations,
                logTruncated,
                meta: tx.meta,
                reservedComputeUnits,
                signature,
                unavailable: false,
                version: tx.message.version,
            };
        });
        return { invokedPrograms, transactions };
    }, [block, cluster, epoch]);

    const [filteredTransactions, showComputeUnits] = React.useMemo((): [TransactionWithInvocations[], boolean] => {
        const voteFilter = VOTE_PROGRAM_ADDRESS;
        const filteredTxs: TransactionWithInvocations[] = transactions
            .filter(({ invocations }) => {
                if (programFilter === ALL_TRANSACTIONS) {
                    return true;
                } else if (programFilter === HIDE_VOTES) {
                    // hide vote txs that don't invoke any other programs
                    return !(invocations.has(voteFilter) && invocations.size === 1);
                }
                return invocations.has(programFilter);
            })
            .filter(({ index }) => {
                if (accountFilter === undefined) {
                    return true;
                }

                const tx = block.transactions[index];
                if (!tx || !isBlockTransaction(tx)) return false;
                return getBlockTransactionAccounts(tx).includes(accountFilter);
            })
            .filter(
                ({ version }) =>
                    versionFilter === undefined || (version !== undefined && versionFilter.includes(version)),
            )
            // An unavailable transaction has no known status, so no status filter matches it.
            .filter(
                tx =>
                    statusFilter === undefined ||
                    (!tx.unavailable && (isFailed(tx) ? 'failed' : 'succeeded') === statusFilter),
            );

        const showComputeUnits = filteredTxs.every(tx => tx.unavailable || tx.computeUnits !== undefined);

        return [sortTransactions(filteredTxs, sortMode, sortDirection, showComputeUnits), showComputeUnits];
    }, [
        block.transactions,
        transactions,
        programFilter,
        accountFilter,
        versionFilter,
        statusFilter,
        sortMode,
        sortDirection,
    ]);

    // Shared by the filter dropdown (menu options + active row) and the removable chip below the title.
    // "Set" means anything other than the empty-param default ("All Except Votes"): the default gets no chip,
    // and clearing a chip returns to it, the same as the Program section's reset.
    const filterModel = React.useMemo(
        () => buildFilterModel(programFilter, invokedPrograms, cluster, transactions.length),
        [programFilter, invokedPrograms, cluster, transactions.length],
    );
    const isProgramFilterSet = programFilter !== HIDE_VOTES;
    const versionOptions = React.useMemo(() => buildVersionOptions(transactions), [transactions]);
    const versionLabel = versionFilter
        ?.map(picked => BLOCK_TRANSACTION_VERSIONS.find(({ version }) => version === picked)?.label)
        .join(', ');
    const isFilterSet =
        isProgramFilterSet || accountFilter !== undefined || versionFilter !== undefined || statusFilter !== undefined;

    if (transactions.length === 0) {
        return <ErrorCard text="This block has no transactions" />;
    }

    const visible = filteredTransactions.slice(0, numDisplayed);
    const hasMore = filteredTransactions.length > numDisplayed;
    const emptyFilterMessage =
        accountFilter === undefined &&
        statusFilter === undefined &&
        versionFilter === undefined &&
        programFilter === HIDE_VOTES
            ? "This block doesn't contain any non-vote transactions"
            : 'No transactions found with this filter';

    return (
        <DataListCard
            breakpoint="md"
            // The record count rides in the title as a muted, smaller run.
            title={
                <>
                    <span className="mr-2">Block Transactions</span>
                    {/* `inline-block` keeps the count atomic: it wraps to the next line whole rather than
                        breaking mid-phrase when it can't sit beside the title. */}
                    <span className="inline-block text-sm font-normal text-outer-space-300">
                        {filteredTransactions.length} {isFilterSet ? 'filtered records' : 'records'}
                    </span>
                </>
            }
            titleClassName="items-end gap-4"
            belowTitle={
                isFilterSet ? (
                    <>
                        {(isProgramFilterSet || versionLabel !== undefined || statusFilter !== undefined) && (
                            // `flex-wrap-reverse`: pills fill the bottom row left to right, and overflow wraps upward,
                            // so the row nearest the list stays full.
                            <div className="-mt-1 flex flex-wrap-reverse items-center gap-2">
                                {isProgramFilterSet && (
                                    <FilterChip
                                        field="Program"
                                        label={filterModel.current.name}
                                        applyReset={params => params.delete('filter')}
                                    />
                                )}
                                {versionLabel !== undefined && (
                                    <FilterChip
                                        field="Version"
                                        label={versionLabel}
                                        applyReset={params => params.delete(VERSION_PARAM)}
                                    />
                                )}
                                {statusFilter !== undefined && (
                                    <FilterChip
                                        field="Status"
                                        label={STATUS_LABELS[statusFilter]}
                                        applyReset={params => params.delete(STATUS_PARAM)}
                                    />
                                )}
                            </div>
                        )}
                        {accountFilter !== undefined && (
                            <div className="text-sm text-white">
                                Showing transactions which load account:
                                <span className="ml-1.5 inline-block align-middle">
                                    <Address address={accountFilter} link />
                                </span>
                            </div>
                        )}
                    </>
                ) : undefined
            }
            actions={
                <>
                    {/* The grid's sort headers are hidden below md, so surface them here on mobile. */}
                    <SortDropdown
                        showComputeUnits={showComputeUnits}
                        sortMode={sortMode}
                        sortDirection={sortDirection}
                        onSort={pushSort}
                    />
                    <FilterDropdown
                        options={filterModel.options}
                        currentFilter={programFilter}
                        isFilterSet={isProgramFilterSet || versionFilter !== undefined || statusFilter !== undefined}
                        versionOptions={versionOptions}
                        versionSelection={versionSelection}
                        statusSelection={statusSelection}
                    />
                </>
            }
        >
            {filteredTransactions.length === 0 ? (
                <div className={cn(ROW_PADDING, 'text-sm text-white')}>{emptyFilterMessage}</div>
            ) : (
                <BlockHistoryGrid
                    rows={visible}
                    showComputeUnits={showComputeUnits}
                    onSort={pushSort}
                    sortMode={sortMode}
                    sortDirection={sortDirection}
                />
            )}
            {hasMore && <LoadMoreButton onClick={() => setNumDisplayed(displayed => displayed + PAGE_SIZE)} />}
        </DataListCard>
    );
}

// Domain status → badge label/variant.
const HISTORY_STATUS = {
    failed: { label: 'Failed', variant: 'warning' },
    success: { label: 'Success', variant: 'success' },
    unavailable: { label: 'Unavailable', variant: 'warning' },
} as const;

// A transaction without a signature can't be looked up, so it's shown (and filtered) as failed.
function isFailed(tx: Pick<TransactionWithInvocations, 'meta' | 'signature'>): boolean {
    return Boolean(tx.meta?.err) || !tx.signature;
}

// One shared formatter instance — constructing `Intl.NumberFormat` per call is needlessly expensive.
const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const numberFmt = (n: number | bigint) => NUMBER_FORMAT.format(n);

// A dim up/down chevron pair marking a sortable header; the arrow for the active direction lights up
// white. Absolutely positioned in an `h-4`/`w-1` box so the taller glyph stack doesn't grow the row.
function SortIndicator({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
    return (
        <span className="relative inline-block h-4 w-1">
            <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center leading-none">
                <ChevronUp
                    size={11}
                    strokeWidth={2.5}
                    className={active && direction === 'asc' ? 'text-white' : 'text-outer-space-300'}
                />
                <ChevronDown
                    size={11}
                    strokeWidth={2.5}
                    className={cn('-mt-1', active && direction === 'desc' ? 'text-white' : 'text-outer-space-300')}
                />
            </span>
        </span>
    );
}

// A CSS grid on md+, stacked labelled rows below md. Sortable numeric headers push the sort through
// `onSort` (the URL-param mechanism).
function BlockHistoryGrid({
    rows,
    showComputeUnits,
    onSort,
    sortMode,
    sortDirection,
}: {
    rows: TransactionWithInvocations[];
    showComputeUnits: boolean;
    onSort: (sortKey: SortMode) => void;
    sortMode: SortMode;
    sortDirection: SortDirection;
}) {
    // Signature takes the slack; the numeric columns are capped wide enough for their label + sort
    // chevrons. The Compute column only exists when compute data is available. Inline (not a
    // `grid-cols-[…]` class) so the Storybook JIT can't purge it.
    const gridStyle: React.CSSProperties = {
        gridTemplateColumns: `minmax(auto,2.5rem) minmax(0,1fr) minmax(auto,7rem) minmax(auto,7.5rem) ${
            showComputeUnits ? 'minmax(auto,7.5rem) ' : ''
        }minmax(auto,4rem)`,
    };

    // `sortKey` maps the header to the URL sort param (undefined = not sortable). The active column's
    // SortIndicator reflects the live `sortDirection`; inactive sortable columns show a dim chevron pair.
    const headers: { label: string; numeric?: boolean; sortKey?: SortMode }[] = [
        { label: '#', sortKey: 'index' },
        { label: 'Signature / Programs' },
        { label: 'Fee', numeric: true, sortKey: 'fee' },
    ];
    if (showComputeUnits) {
        headers.push({ label: 'CUs Consumed', numeric: true, sortKey: 'compute' });
    }
    headers.push(
        { label: 'CUs Reserved', numeric: true, sortKey: 'reservedCUs' },
        { label: 'Cost', numeric: true, sortKey: 'txnCost' },
    );

    return (
        <div className="text-sm text-white">
            <div
                style={gridStyle}
                className={cn(
                    'hidden gap-4 border-b border-solid border-white/10 text-xs uppercase text-outer-space-300 md:grid',
                    ROW_PADDING,
                )}
            >
                {headers.map(header => {
                    const sortKey = header.sortKey;
                    const active = sortKey !== undefined && sortMode === sortKey;
                    return (
                        <div
                            key={header.label}
                            className={cn(
                                header.numeric && 'text-right',
                                sortKey !== undefined && 'cursor-pointer select-none',
                                active && 'text-white',
                            )}
                            onClick={sortKey !== undefined ? () => onSort(sortKey) : undefined}
                        >
                            {/* The chevron pair always follows the label (right-aligned numeric columns keep it
                                to the right of the label too). */}
                            <span className="inline-flex items-center gap-2">
                                {header.label}
                                {sortKey !== undefined && (
                                    <SortIndicator active={active} direction={active ? sortDirection : 'desc'} />
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
            {rows.map(tx => (
                <BlockHistoryGridRow
                    key={tx.signature ?? `index-${tx.index}`}
                    tx={tx}
                    showComputeUnits={showComputeUnits}
                    gridStyle={gridStyle}
                />
            ))}
        </div>
    );
}

function BlockHistoryGridRow({
    tx,
    showComputeUnits,
    gridStyle,
}: {
    tx: TransactionWithInvocations;
    showComputeUnits: boolean;
    gridStyle: React.CSSProperties;
}) {
    const status = tx.unavailable
        ? HISTORY_STATUS.unavailable
        : isFailed(tx)
          ? HISTORY_STATUS.failed
          : HISTORY_STATUS.success;
    const badge = (
        <Badge ui="dashkit" variant={status.variant}>
            {status.label}
        </Badge>
    );
    const versionBadge = tx.version !== undefined && (
        <Badge ui="dashkit" variant="secondary">
            {BLOCK_TRANSACTION_VERSIONS.find(({ version }) => version === tx.version)?.label ?? String(tx.version)}
        </Badge>
    );
    const signatureNode = tx.signature ? <Signature signature={tx.signature} link /> : '-';
    const feeNode = tx.meta !== null ? <SolBalance lamports={tx.meta.fee} /> : 'Unknown';
    const reserved = tx.reservedComputeUnits !== undefined ? numberFmt(tx.reservedComputeUnits) : 'Unknown';
    const compute = `${tx.logTruncated ? '>' : ''}${tx.computeUnits !== undefined ? numberFmt(tx.computeUnits) : 'Unknown'}`;
    const txnCost = tx.costUnits !== undefined ? numberFmt(tx.costUnits) : 'Unknown';
    const entries = Array.from(tx.invocations.entries());
    entries.sort();
    const invokedNode =
        entries.length === 0 ? (
            'NA'
        ) : (
            // Two-column grid so the "N ×" counters share one right-aligned column and the program names
            // line up in the next. Inline grid template so the Storybook JIT can't purge it.
            <div className="grid items-center gap-x-1.5 gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr' }}>
                {entries.map(([programId, count]) => (
                    <React.Fragment key={programId}>
                        <span className="whitespace-nowrap text-right tabular-nums text-outer-space-300">
                            {count} ×
                        </span>
                        <Address address={address(programId)} link />
                    </React.Fragment>
                ))}
            </div>
        );

    // Signature with the Result badge to its right. On desktop the invoked programs stack beneath it
    // (`signatureBlock`); on mobile they move to their own labelled "Programs" field.
    const signatureHeader = (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="min-w-0">{signatureNode}</span>
            {badge}
            {versionBadge}
        </div>
    );
    // Signature cell: on desktop the invoked programs stack beneath the signature+badge header; on mobile
    // they move to their own labelled "Programs" field, so each layout renders the signature differently.
    const cells: ResponsiveCell[] = [
        {
            children: tx.index + 1,
            desktopClassName: 'text-outer-space-300',
            hideMobile: true,
            key: 'index',
            label: '#',
        },
        {
            desktop: (
                <>
                    {signatureHeader}
                    <div className="mt-1">{invokedNode}</div>
                </>
            ),
            desktopClassName: 'min-w-0',
            key: 'signature',
            label: 'Signature',
            mobile: <div className="pr-10">{signatureHeader}</div>,
        },
        { children: feeNode, desktopClassName: 'text-right', key: 'fee', label: 'Fee' },
        ...(showComputeUnits
            ? [{ children: compute, desktopClassName: 'text-right', key: 'compute', label: 'CUs Consumed' }]
            : []),
        { children: reserved, desktopClassName: 'text-right', key: 'reserved', label: 'CUs Reserved' },
        { children: txnCost, desktopClassName: 'text-right', key: 'cost', label: 'Cost' },
        { children: invokedNode, hideDesktop: true, key: 'programs', label: 'Programs', mobileAlign: 'start' },
    ];

    return (
        <ResponsiveGridRow
            cells={cells}
            gridStyle={gridStyle}
            mobileClassName="relative gap-1.5"
            desktopClassName="gap-4"
            pinnedTopRight={<span className="absolute right-3 top-2.5 text-outer-space-300">#{tx.index + 1}</span>}
        />
    );
}

const ALL_TRANSACTIONS = 'all';
const HIDE_VOTES = '';
const VERSION_PARAM = 'version';

function versionParam(version: TransactionVersion): string {
    return String(version);
}

type VersionOption = {
    label: string;
    transactionCount: number;
    version: TransactionVersion;
};

function buildVersionOptions(transactions: { version?: TransactionVersion }[]): VersionOption[] {
    return BLOCK_TRANSACTION_VERSIONS.map(({ label, version }) => ({
        label,
        transactionCount: transactions.filter(tx => tx.version === version).length,
        version,
    }));
}

type FilterOption = {
    name: string;
    programId: string;
    transactionCount: number;
};

// Builds the dropdown's option list plus the currently-active option. Kept as a plain function (not a
// component) so both the dropdown and the removable chip below the title work off the same model.
// "All Except Votes" is the empty-param default; "All Transactions" is the "no filter" state.
function buildFilterModel(
    filter: string,
    invokedPrograms: Map<string, number>,
    cluster: Parameters<typeof displayAddress>[1],
    totalTransactionCount: number,
): { current: FilterOption; options: FilterOption[] } {
    const defaultFilterOption: FilterOption = {
        name: 'All Except Votes',
        programId: HIDE_VOTES,
        transactionCount: totalTransactionCount - (invokedPrograms.get(VOTE_PROGRAM_ADDRESS) || 0),
    };
    const allTransactionsOption: FilterOption = {
        name: 'All Transactions',
        programId: ALL_TRANSACTIONS,
        transactionCount: totalTransactionCount,
    };

    let current = filter === ALL_TRANSACTIONS ? allTransactionsOption : defaultFilterOption;
    const options: FilterOption[] = [defaultFilterOption, allTransactionsOption];

    invokedPrograms.forEach((transactionCount, programId) => {
        const option: FilterOption = { name: displayAddress(programId, cluster), programId, transactionCount };
        if (filter === programId) {
            current = option;
        }
        options.push(option);
    });

    options.sort((a, b) => {
        if (a.transactionCount !== b.transactionCount) {
            return b.transactionCount - a.transactionCount;
        } else {
            return b.name > a.name ? -1 : 1;
        }
    });

    return { current, options };
}

// The Sidebar's sections in a dropdown under the Filters button: one section per field, applied live, so the
// dropdown stays open while several filters are combined.
const FilterDropdown = ({
    options,
    currentFilter,
    isFilterSet,
    versionOptions,
    versionSelection,
    statusSelection,
}: {
    options: FilterOption[];
    currentFilter: string;
    isFilterSet: boolean;
    versionOptions: VersionOption[];
    versionSelection: TransactionVersion[];
    statusSelection: HistoryStatus[];
}) => {
    const pushParam = usePushParam();

    return (
        <Popover>
            <PopoverTrigger asChild>
                {/* Icon-only below md; the label appears from md up. The dot marks an active filter. */}
                <Button
                    ui="dashkit"
                    variant="white"
                    size="sm"
                    type="button"
                    className="relative mr-1.5"
                    aria-label="Filters"
                >
                    <Filter size={13} className="relative top-0.5 inline align-text-top md:mr-1.5" />
                    <span className="hidden md:inline">Filters</span>
                    {isFilterSet && (
                        // `bg-accent` (≈ accent-600) is the dot; the ring is `accent-700`, the next darker
                        // step in the tw palette, so the badge reads as a two-tone green.
                        <span
                            aria-hidden
                            className="absolute -right-[3px] -top-[3px] h-2.5 w-2.5 rounded-full border border-solid border-accent-700 bg-accent"
                        />
                    )}
                </Button>
            </PopoverTrigger>
            {/* Capped to the room below the button, so a long program list scrolls inside the dropdown. */}
            <PopoverContent
                align="end"
                className="flex max-h-[min(36rem,var(--radix-popover-content-available-height))] w-96 max-w-[calc(100vw-2rem)] flex-col"
            >
                {/* The program list is the scroller and gives up height first when the dropdown is capped; this
                    column scrolls too only on a screen too short for that list's 10rem floor. */}
                <div className="flex min-h-0 flex-col overflow-y-auto pb-5 scrollbar-styled">
                    {/* Reset shows while anything is picked, even every chip, which filters nothing but is
                            still a pick to clear. */}
                    <BaseFilterSection
                        title="Status"
                        className={SECTION_CLASS}
                        headerClassName="px-5"
                        onReset={statusSelection.length === 0 ? undefined : () => pushParam(STATUS_PARAM)}
                    >
                        <BaseToggleChips
                            className={CHIPS_CLASS}
                            options={STATUS_VALUES.map(status => ({ label: STATUS_LABELS[status], value: status }))}
                            selected={statusSelection}
                            onChange={next => pushParam(STATUS_PARAM, joinPicks(next))}
                        />
                    </BaseFilterSection>
                    <BaseFilterSection
                        title="Transaction version"
                        className={SECTION_CLASS}
                        headerClassName="px-5"
                        onReset={versionSelection.length === 0 ? undefined : () => pushParam(VERSION_PARAM)}
                    >
                        <BaseToggleChips
                            className={CHIPS_CLASS}
                            options={versionOptions.map(({ label, transactionCount, version }) => ({
                                count: transactionCount,
                                label,
                                value: versionParam(version),
                            }))}
                            selected={versionSelection.map(versionParam)}
                            onChange={next => pushParam(VERSION_PARAM, joinPicks(next))}
                        />
                    </BaseFilterSection>
                    <BaseFilterSection
                        title="Program"
                        className="flex min-h-0 flex-col pt-7"
                        headerClassName="px-5"
                        // Reset returns to the default "All Except Votes", the bare URL with no `filter` param.
                        onReset={currentFilter === HIDE_VOTES ? undefined : () => pushParam('filter')}
                    >
                        {/* A bounded window: the program list can run to hundreds of rows, so it scrolls inside
                            instead of stretching the dropdown. */}
                        <div className="flex min-h-0 flex-col px-5">
                            <FilterListbox
                                className="min-h-40"
                                options={options.map(({ name, programId, transactionCount }) => ({
                                    count: transactionCount,
                                    label: name,
                                    value: programId,
                                }))}
                                selected={[currentFilter]}
                                searchPlaceholder="Search programs"
                                // "All Except Votes" is the default, so it's the bare URL with no `filter` param.
                                onChange={([value]) =>
                                    pushParam('filter', value === undefined || value === HIDE_VOTES ? undefined : value)
                                }
                            />
                        </div>
                    </BaseFilterSection>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// No dividers: the space above each section and its label do the grouping. 28px between sections; the first
// keeps 20px, the panel's side inset.
const SECTION_CLASS = 'shrink-0 pt-7 first:pt-5';
const CHIPS_CLASS = 'flex flex-wrap-reverse gap-2 px-5';

// Several picks share one comma-separated param; no pick drops the param.
function joinPicks(picks: string[]): string | undefined {
    return picks.length === 0 ? undefined : picks.join(',');
}

// Pushes the current URL with one param set, or deleted when `value` is undefined. `scroll: false`: the panel
// stays open across picks, so the page underneath must not jump to the top.
function usePushParam() {
    const router = useRouter();
    const currentPathname = usePathname();
    const currentSearchParams = useSearchParams();
    return React.useCallback(
        (param: string, value?: string) => {
            const params = new URLSearchParams(currentSearchParams?.toString());
            if (value === undefined) {
                params.delete(param);
            } else {
                params.set(param, value);
            }
            const nextQueryString = params.toString();
            router.push(`${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`, { scroll: false });
        },
        [currentPathname, currentSearchParams, router],
    );
}

// Sortable columns in header order, mirroring the grid's clickable headers (Compute only when its data
// exists). The nouns fill the "Lowest …" / "Highest …" sort-menu labels.
const SORT_NOUNS: Record<SortMode, string> = {
    compute: 'CUs consumed',
    fee: 'fee',
    index: 'index',
    reservedCUs: 'CUs reserved',
    txnCost: 'cost',
};

function sortModes(showComputeUnits: boolean): SortMode[] {
    return ['index', 'fee', ...(showComputeUnits ? (['compute'] as const) : []), 'reservedCUs', 'txnCost'];
}

// The two-glyph indicator used in the sort menu: the arrow for this row's direction takes the row's text
// colour (`text-current`), the other stays a dimmer, darker grey.
function SortOptionGlyph({ direction }: { direction: SortDirection }) {
    return (
        <span aria-hidden className="relative inline-block h-4 w-2 align-text-top">
            <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center leading-none">
                <ChevronUp
                    size={11}
                    strokeWidth={2.5}
                    className={direction === 'asc' ? 'text-current' : 'text-outer-space-600'}
                />
                <ChevronDown
                    size={11}
                    strokeWidth={2.5}
                    className={cn('-mt-1', direction === 'desc' ? 'text-current' : 'text-outer-space-600')}
                />
            </span>
        </span>
    );
}

// Mobile-only counterpart to the grid's sortable headers (hidden below md): a "Filters"-style button
// opening every sort column split into its two directions ("Lowest …" ascending, "Highest …" descending).
// Each row pushes an explicit direction through the same `onSort` (pushSort) path the headers use.
const SortDropdown = ({
    showComputeUnits,
    sortMode,
    sortDirection,
    onSort,
}: {
    showComputeUnits: boolean;
    sortMode: SortMode;
    sortDirection: SortDirection;
    onSort: (sortKey: SortMode, direction: SortDirection) => void;
}) => {
    const options = sortModes(showComputeUnits).flatMap(mode => [
        { direction: 'asc' as SortDirection, label: `Lowest ${SORT_NOUNS[mode]}`, mode },
        { direction: 'desc' as SortDirection, label: `Highest ${SORT_NOUNS[mode]}`, mode },
    ]);

    return (
        <Dropdown className="mr-1.5 md:hidden">
            <DropdownToggle asChild>
                <Button ui="dashkit" variant="white" size="sm" type="button" aria-label="Sort">
                    {/* Up/down chevron pair — the same sort motif the table headers carry. */}
                    <span aria-hidden className="relative inline-block h-4 w-3 align-text-top">
                        <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center leading-none">
                            <ChevronUp size={11} strokeWidth={2.5} />
                            <ChevronDown size={11} strokeWidth={2.5} className="-mt-1" />
                        </span>
                    </span>
                </Button>
            </DropdownToggle>
            <DropdownMenu align="end" className="mt-0.5 w-[220px] !border-white/20">
                {options.map(({ direction, label, mode }) => {
                    const active = sortMode === mode && sortDirection === direction;
                    return (
                        <DropdownItem
                            key={`${mode}-${direction}`}
                            role="button"
                            onClick={() => onSort(mode, direction)}
                            className={cn('relative cursor-pointer', active && 'active')}
                        >
                            {active && (
                                <span
                                    aria-hidden
                                    className="absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-current"
                                />
                            )}
                            {/* Glyph sits right after the label, not pushed to the row's end. */}
                            <span className="inline-flex items-center gap-1.5">
                                {label}
                                <SortOptionGlyph direction={direction} />
                            </span>
                        </DropdownItem>
                    );
                })}
            </DropdownMenu>
        </Dropdown>
    );
};

function FilterChip({
    field,
    label,
    applyReset,
}: {
    field: string;
    label: string;
    applyReset: (params: URLSearchParams) => void;
}) {
    const currentSearchParams = useSearchParams();
    const currentPathname = usePathname();
    const resetHref = useMemo(() => {
        const params = new URLSearchParams(currentSearchParams?.toString());
        applyReset(params);
        const nextQueryString = params.toString();
        return `${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
    }, [applyReset, currentPathname, currentSearchParams]);

    return (
        <div className="box-border inline-flex h-[28.75px] max-w-full items-center rounded border border-solid border-outer-space-800 bg-outer-space-900 pl-2.5 pr-1 text-sm text-white">
            <span className="mr-1.5 shrink-0 text-outer-space-300">{field}</span>
            <span className="min-w-0 truncate">{label}</span>
            <Link
                href={resetHref}
                aria-label={`Clear ${field.toLowerCase()} filter`}
                className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-outer-space-300 hover:bg-white/10 hover:text-white"
            >
                <X size={12} />
            </Link>
        </div>
    );
}
