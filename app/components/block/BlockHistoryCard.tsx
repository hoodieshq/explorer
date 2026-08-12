import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { Signature } from '@components/common/Signature';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';
import type { BlockWithV1 } from '@entities/block-data';
import { estimateRequestedComputeUnits } from '@entities/compute-unit';
import { useCluster } from '@providers/cluster';
import { ConfirmedTransactionMeta, PublicKey, TransactionSignature, VOTE_PROGRAM_ID } from '@solana/web3.js';
import { parseProgramLogs } from '@utils/program-logs';
import { displayAddress } from '@utils/tx';
import { useBuildClusterPath } from '@utils/url';
import Link from 'next/link';
import { ReadonlyURLSearchParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter, Search, X } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { Input } from '@/app/components/shared/ui/input';
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';
import { invariant } from '@/app/shared/lib/invariant';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

const PAGE_SIZE = 25;

// Design variant, switchable via prop (see the other block cards for the same pattern):
//   - 'default'     — the original Dashkit table.
//   - 'collapsible' — the domains-card treatment (PR #115): the title lifted out above a collapsible
//                     section (filter dropdown kept as its action), list on a `tight` card surface,
//                     CSS-grid body on `md+` and a stacked, labelled layout below `md`. Sorting and
//                     "Load More" are preserved.
export type BlockHistoryVariant = 'default' | 'collapsible';

// Surface matched to the transaction tables (see BaseDomainsCard) — set on a `variant="tight"` Card.
// `!rounded-lg` (8px) forces the radius over the tw base's `rounded-xl` (12px): without Preflight the
// two utilities collide and source order — not class order — would otherwise leave the card at 12px,
// out of step with the dashkit cards (Overview / transaction page) that sit at 8px.
const TIGHT_CARD = 'overflow-hidden !rounded-lg border-outer-space-800 bg-outer-space-900';

const useQueryProgramFilter = (query: ReadonlyURLSearchParams): string => {
    const filter = query.get('filter');
    return filter || '';
};

const useQueryAccountFilter = (query: ReadonlyURLSearchParams): PublicKey | null => {
    const filter = query.get('accountFilter');
    if (filter !== null) {
        try {
            return new PublicKey(filter);
        } catch {
            /* empty */
        }
    }
    return null;
};

type SortMode = 'index' | 'compute' | 'txnCost' | 'fee' | 'reservedCUs';
type SortDirection = 'asc' | 'desc';

// Each column's natural first-click direction — index reads low→high, the numeric columns high→low.
const DEFAULT_DIRECTION: Record<SortMode, SortDirection> = {
    compute: 'desc',
    fee: 'desc',
    index: 'asc',
    reservedCUs: 'desc',
    txnCost: 'desc',
};

const useQuerySort = (query: ReadonlyURLSearchParams): { mode: SortMode; direction: SortDirection } => {
    const sort = query.get('sort');
    const mode: SortMode =
        sort === 'compute'
            ? 'compute'
            : sort === 'txnCost'
              ? 'txnCost'
              : sort === 'fee'
                ? 'fee'
                : sort === 'reservedCUs'
                  ? 'reservedCUs'
                  : 'index';
    const dir = query.get('dir');
    const direction: SortDirection = dir === 'asc' || dir === 'desc' ? dir : DEFAULT_DIRECTION[mode];
    return { direction, mode };
};

type TransactionWithInvocations = {
    index: number;
    signature?: TransactionSignature;
    meta: ConfirmedTransactionMeta | null;
    invocations: Map<string, number>;
    computeUnits?: number;
    costUnits?: number;
    reservedComputeUnits?: number;
    logTruncated: boolean;
};

export function BlockHistoryCard({
    block,
    epoch,
    variant = 'default',
}: {
    block: BlockWithV1;
    epoch: bigint | undefined;
    variant?: BlockHistoryVariant;
}) {
    const [numDisplayed, setNumDisplayed] = React.useState(PAGE_SIZE);
    const currentPathname = usePathname();
    const currentSearchParams = useSearchParams();
    const programFilter = useQueryProgramFilter(currentSearchParams);
    const accountFilter = useQueryAccountFilter(currentSearchParams);
    const { direction: sortDirection, mode: sortMode } = useQuerySort(currentSearchParams);
    const router = useRouter();
    const { cluster } = useCluster();
    const buildClusterPath = useBuildClusterPath();

    // Sort is driven by URL params (`sort` + `dir`); the grid variant's sortable headers push through here.
    // Clicking the active column flips its direction; clicking another column selects it at its natural
    // default direction. `index` ascending is the default view, so it's written as no params (clean URL);
    // passing no key clears the sort entirely (the old table's "#" reset). We build the URL from a copy of
    // the current params so a `delete` actually drops the keys — `pickClusterParams` only adds/overrides.
    const pushSort = React.useCallback(
        (sortKey?: SortMode) => {
            const nextParams = new URLSearchParams(currentSearchParams?.toString());
            const nextDirection: SortDirection =
                sortKey && sortKey === sortMode
                    ? sortDirection === 'asc'
                        ? 'desc'
                        : 'asc'
                    : sortKey
                      ? DEFAULT_DIRECTION[sortKey]
                      : 'asc';
            if (sortKey && !(sortKey === 'index' && nextDirection === 'asc')) {
                nextParams.set('sort', sortKey);
                nextParams.set('dir', nextDirection);
            } else {
                nextParams.delete('sort');
                nextParams.delete('dir');
            }
            const queryString = nextParams.toString();
            router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
        },
        [currentPathname, currentSearchParams, router, sortMode, sortDirection],
    );

    const { transactions, invokedPrograms } = React.useMemo(() => {
        const invokedPrograms = new Map<string, number>();

        const transactions: TransactionWithInvocations[] = block.transactions.map((tx, index) => {
            let signature: TransactionSignature | undefined;
            if (tx.transaction.signatures.length > 0) {
                signature = tx.transaction.signatures[0];
            }

            const programIndexes = tx.transaction.message.compiledInstructions
                .map(ix => ix.programIdIndex)
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
            const accountKeys = tx.transaction.message.getAccountKeys({
                accountKeysFromLookups: tx.meta?.loadedAddresses,
            });
            indexMap.forEach((count, i) => {
                const accountKey = accountKeys.get(i);
                invariant(accountKey, `account key index ${i} out of range`);
                const programId = accountKey.toBase58();
                invocations.set(programId, count);
                const programTransactionCount = invokedPrograms.get(programId) || 0;
                invokedPrograms.set(programId, programTransactionCount + 1);
            });

            let logTruncated = false;
            let computeUnits: number | undefined = undefined;
            try {
                const parsedLogs = parseProgramLogs(tx.meta?.logMessages ?? [], tx.meta?.err ?? null, cluster);

                logTruncated = parsedLogs[parsedLogs.length - 1].truncated;
                computeUnits = parsedLogs.map(({ computeUnits }) => computeUnits).reduce((sum, next) => sum + next);
            } catch (_err) {
                // ignore parsing errors because some old logs aren't parsable
            }

            let costUnits: number | undefined = undefined;
            try {
                costUnits = tx.meta?.costUnits ?? 0;
            } catch (_err) {
                // ignore parsing errors because some old logs aren't parsable
            }

            // Calculate reserved compute units
            const reservedComputeUnits = estimateRequestedComputeUnits(tx, epoch, cluster);

            return {
                computeUnits,
                costUnits,
                index,
                invocations,
                logTruncated,
                meta: tx.meta,
                reservedComputeUnits,
                signature,
            };
        });
        return { invokedPrograms, transactions };
    }, [block, cluster, epoch]);

    const [filteredTransactions, showComputeUnits] = React.useMemo((): [TransactionWithInvocations[], boolean] => {
        const voteFilter = VOTE_PROGRAM_ID.toBase58();
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
                if (accountFilter === null) {
                    return true;
                }

                const tx = block.transactions[index];
                const accountKeys = tx.transaction.message.getAccountKeys({
                    accountKeysFromLookups: tx.meta?.loadedAddresses,
                });
                return accountKeys
                    .keySegments()
                    .flat()
                    .find(key => key.equals(accountFilter));
            });

        const showComputeUnits = filteredTxs.every(tx => tx.computeUnits !== undefined);

        // Base comparators are ascending; `dir` flips them so a repeat click reverses the order.
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortMode === 'index') {
            filteredTxs.sort((a, b) => dir * (a.index - b.index));
        } else if (sortMode === 'compute' && showComputeUnits) {
            filteredTxs.sort((a, b) => dir * ((a.computeUnits ?? 0) - (b.computeUnits ?? 0)));
        } else if (sortMode === 'txnCost') {
            filteredTxs.sort((a, b) => dir * ((a.costUnits ?? 0) - (b.costUnits ?? 0)));
        } else if (sortMode === 'fee') {
            filteredTxs.sort((a, b) => dir * ((a.meta?.fee || 0) - (b.meta?.fee || 0)));
        } else if (sortMode === 'reservedCUs') {
            filteredTxs.sort((a, b) => dir * ((a.reservedComputeUnits || 0) - (b.reservedComputeUnits || 0)));
        }

        return [filteredTxs, showComputeUnits];
    }, [block.transactions, transactions, programFilter, accountFilter, sortMode, sortDirection]);

    // Shared by the filter dropdown (menu options + active row) and the removable chip below the title.
    // "Set" means anything other than "All Transactions": the empty-param default ("All Except Votes")
    // already hides votes, so it counts as an active filter — clearing the chip lands on "All Transactions".
    const filterModel = React.useMemo(
        () => buildFilterModel(programFilter, invokedPrograms, cluster, transactions.length),
        [programFilter, invokedPrograms, cluster, transactions.length],
    );
    const isProgramFilterSet = programFilter !== ALL_TRANSACTIONS;

    if (transactions.length === 0) {
        return <ErrorCard text="This block has no transactions" />;
    }

    let title: string;
    if (filteredTransactions.length === transactions.length) {
        title = `Block Transactions (${filteredTransactions.length})`;
    } else {
        title = `Filtered Block Transactions (${filteredTransactions.length}/${transactions.length})`;
    }

    if (variant === 'collapsible') {
        const visible = filteredTransactions.slice(0, numDisplayed);
        const hasMore = filteredTransactions.length > numDisplayed;
        const emptyFilterMessage =
            accountFilter === null && programFilter === HIDE_VOTES
                ? "This block doesn't contain any non-vote transactions"
                : 'No transactions found with this filter';

        return (
            <CollapsibleSection
                // The record count rides in the title as a muted, smaller run — "N filtered records" when a
                // filter is active, otherwise "N records".
                title={
                    <>
                        {/* Gap lives on the title (`mr-2`), not the count, so when the count wraps to its own
                            line it sits flush-left under the title instead of indented. */}
                        <span className="mr-2">Block Transactions</span>
                        {/* `inline-block` makes the count an atomic unit: it stays on one line and wraps to
                            the next line whole when it can't sit beside the title; its width is measured
                            against the full container, so words only break once the block itself overflows. */}
                        <span className="inline-block text-sm font-normal text-outer-space-300">
                            {filteredTransactions.length}{' '}
                            {isProgramFilterSet || accountFilter !== null ? 'filtered records' : 'records'}
                        </span>
                    </>
                }
                className=""
                // Buttons form the second column, bottom-aligned; `gap-4` keeps the chip off them.
                titleClassName="!items-end gap-4"
                // Only the active-filter chip sits under the title now. `-mt-1` trims 4px off the title
                // column's 8px gap (bringing the count text closer); `mb-0.5` adds 2px under the chip on
                // top of the section's own 12px gap to the table.
                belowTitle={
                    isProgramFilterSet ? (
                        <div className="-mt-1 mb-0.5 flex flex-wrap items-center gap-2">
                            <FilterChip label={filterModel.current.name} />
                        </div>
                    ) : undefined
                }
                actions={
                    <FilterDropdown
                        options={filterModel.options}
                        currentFilter={programFilter}
                        isFilterSet={isProgramFilterSet}
                    />
                }
            >
                <div className="flex flex-col gap-3">
                    {accountFilter !== null && (
                        <div className="text-sm text-white">
                            Showing transactions which load account:
                            <span className="ml-1.5 inline-block align-middle">
                                <Address pubkey={accountFilter} link />
                            </span>
                        </div>
                    )}
                    <Card variant="tight" className={TIGHT_CARD}>
                        {filteredTransactions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-white">{emptyFilterMessage}</div>
                        ) : (
                            <BlockHistoryGrid
                                rows={visible}
                                showComputeUnits={showComputeUnits}
                                onSort={pushSort}
                                sortMode={sortMode}
                                sortDirection={sortDirection}
                            />
                        )}
                        {hasMore && (
                            <div className="border-t border-solid border-white/10 px-3 py-4 md:px-4">
                                <Button
                                    ui="dashkit"
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => setNumDisplayed(displayed => displayed + PAGE_SIZE)}
                                >
                                    Load More
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            </CollapsibleSection>
        );
    }

    return (
        <Card ui="dashkit">
            <CardHeader ui="dashkit">
                <CardTitle as="h3" ui="dashkit">
                    {title}
                </CardTitle>
                <FilterDropdown
                    options={filterModel.options}
                    currentFilter={programFilter}
                    isFilterSet={isProgramFilterSet}
                />
            </CardHeader>

            {isProgramFilterSet && (
                <CardBody ui="dashkit">
                    <FilterChip label={filterModel.current.name} />
                </CardBody>
            )}

            {accountFilter !== null && (
                <CardBody ui="dashkit">
                    Showing transactions which load account:
                    <div className="ml-1.5 inline-block">
                        <Address pubkey={accountFilter} link />
                    </div>
                </CardBody>
            )}

            {filteredTransactions.length === 0 ? (
                <CardBody ui="dashkit">
                    {accountFilter === null && programFilter === HIDE_VOTES
                        ? "This block doesn't contain any non-vote transactions"
                        : 'No transactions found with this filter'}
                </CardBody>
            ) : (
                <BaseTable ui="dashkit" variant="card" nowrap>
                    <BaseTable.Head>
                        <BaseTable.Row>
                            <BaseTable.HeaderCell
                                className="cursor-pointer text-dk-gray-700"
                                onClick={() => pushSort()}
                            >

                                #
                            </BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">Result</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">
                                Transaction Signature
                            </BaseTable.HeaderCell>
                            <BaseTable.HeaderCell
                                className="cursor-pointer text-dk-gray-700"
                                onClick={() => {
                                    const additionalParams = new URLSearchParams(currentSearchParams?.toString());
                                    additionalParams.set('sort', 'fee');
                                    router.push(buildClusterPath(currentPathname, { additionalParams }));
                                }}
                            >
                                Fee
                            </BaseTable.HeaderCell>
                            <BaseTable.HeaderCell
                                className="cursor-pointer text-dk-gray-700"
                                onClick={() => {
                                    const additionalParams = new URLSearchParams(currentSearchParams?.toString());
                                    additionalParams.set('sort', 'reservedCUs');
                                    router.push(buildClusterPath(currentPathname, { additionalParams }));
                                }}
                            >
                                CUs Reserved
                            </BaseTable.HeaderCell>
                            {showComputeUnits && (
                                <BaseTable.HeaderCell
                                    className="cursor-pointer text-dk-gray-700"
                                    onClick={() => {
                                        const additionalParams = new URLSearchParams(currentSearchParams?.toString());
                                        additionalParams.set('sort', 'compute');
                                        router.push(buildClusterPath(currentPathname, { additionalParams }));
                                    }}
                                >
                                    CUs Consumed
                                </BaseTable.HeaderCell>
                            )}
                            <BaseTable.HeaderCell
                                className="cursor-pointer text-dk-gray-700"
                                onClick={() => {
                                    const additionalParams = new URLSearchParams(currentSearchParams?.toString());
                                    additionalParams.set('sort', 'txnCost');
                                    router.push(buildClusterPath(currentPathname, { additionalParams }));
                                }}
                            >
                                Txn Cost
                            </BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">Invoked Programs</BaseTable.HeaderCell>
                        </BaseTable.Row>
                    </BaseTable.Head>
                    <BaseTable.Body>
                        {filteredTransactions.slice(0, numDisplayed).map((tx, i) => {
                            let statusText;
                            let statusClass;
                            let signature: React.ReactNode;
                            if (tx.meta?.err || !tx.signature) {
                                statusClass = 'warning';
                                statusText = 'Failed';
                            } else {
                                statusClass = 'success';
                                statusText = 'Success';
                            }

                            if (tx.signature) {
                                signature = <Signature signature={tx.signature} link />;
                            }

                            const entries = Array.from(tx.invocations.entries());
                            entries.sort();

                            return (
                                <BaseTable.Row key={i}>
                                    <BaseTable.Cell>{tx.index + 1}</BaseTable.Cell>
                                    <BaseTable.Cell>
                                        <Badge ui="dashkit" variant={statusClass as 'success' | 'warning'}>
                                            {statusText}
                                        </Badge>
                                    </BaseTable.Cell>

                                    <BaseTable.Cell>{signature}</BaseTable.Cell>

                                    <BaseTable.Cell>
                                        {tx.meta !== null ? <SolBalance lamports={tx.meta.fee} /> : 'Unknown'}
                                    </BaseTable.Cell>

                                    <BaseTable.Cell>
                                        {tx.reservedComputeUnits !== undefined
                                            ? new Intl.NumberFormat('en-US').format(tx.reservedComputeUnits)
                                            : 'Unknown'}
                                    </BaseTable.Cell>

                                    {showComputeUnits && (
                                        <BaseTable.Cell>
                                            {tx.logTruncated && '>'}
                                            {tx.computeUnits !== undefined
                                                ? new Intl.NumberFormat('en-US').format(tx.computeUnits)
                                                : 'Unknown'}
                                        </BaseTable.Cell>
                                    )}
                                    <BaseTable.Cell>
                                        {tx.costUnits !== undefined
                                            ? new Intl.NumberFormat('en-US').format(tx.costUnits)
                                            : 'Unknown'}
                                    </BaseTable.Cell>
                                    <BaseTable.Cell>
                                        {tx.invocations.size === 0
                                            ? 'NA'
                                            : entries.map(([programId, count], i) => {
                                                  return (
                                                      <div key={i} className="flex items-center">
                                                          <Address pubkey={new PublicKey(programId)} link />
                                                          <span className="ml-1.5 text-dk-gray-700">{`(${count})`}</span>
                                                      </div>
                                                  );
                                              })}
                                    </BaseTable.Cell>
                                </BaseTable.Row>
                            );
                        })}
                    </BaseTable.Body>
                </BaseTable>
            )}

            {filteredTransactions.length > numDisplayed && (
                <CardFooter ui="dashkit">
                    <Button
                        ui="dashkit"
                        variant="primary"
                        className="w-full"
                        onClick={() => setNumDisplayed(displayed => displayed + PAGE_SIZE)}
                    >
                        Load More
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

// Domain status → badge label/variant. Mirrors the default table's inline mapping.
const HISTORY_STATUS = {
    failed: { label: 'Failed', variant: 'warning' },
    success: { label: 'Success', variant: 'success' },
} as const;

const numberFmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

// Sort affordance for a header: a dim up/down chevron pair signals the column is clickable; on the
// active column the arrow for the current direction lights up bright white (the other stays dim).
// The chevron stack is taller than the header text, so it's absolutely positioned inside a box whose
// height matches the header line (`h-4` = text-xs line-height) and centred — it never grows the row,
// and the top/bottom overflow stays symmetric so the header's own padding reads even. The box is `w-1`
// (narrower than the glyphs) so the chevrons overflow it and centre tightly under the label.
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

// Domains-card style — a CSS grid on md+, stacked labelled rows below md. Sortable numeric headers push
// the sort through `onSort` (same URL-param mechanism as the default table).
function BlockHistoryGrid({
    rows,
    showComputeUnits,
    onSort,
    sortMode,
    sortDirection,
}: {
    rows: TransactionWithInvocations[];
    showComputeUnits: boolean;
    onSort: (sortKey?: SortMode) => void;
    sortMode: SortMode;
    sortDirection: SortDirection;
}) {
    // Signature takes the slack; the numeric columns are capped tight (≈ content + ~1rem of headroom).
    // Inline (not a `grid-cols-[…]` class) so the Storybook JIT can't purge it. The Compute column only
    // exists when compute data is available. Following the transaction-history card, Result (badge) sits
    // inline with the signature and the invoked programs stack beneath it — so neither gets its own column.
    // CU columns are wide enough to hold "CUs Consumed"/"CUs Reserved" + the sort chevrons on one line;
    // Cost gets a touch more room for its chevrons too.
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
                className="hidden gap-4 border-b border-solid border-white/10 px-4 py-2.5 text-xs uppercase text-outer-space-300 md:grid"
            >
                {headers.map(header => {
                    const sortable = header.sortKey !== undefined;
                    const active = sortable && sortMode === header.sortKey;
                    return (
                        <div
                            key={header.label}
                            className={cn(
                                header.numeric && 'text-right',
                                sortable && 'cursor-pointer select-none',
                                active && 'text-white',
                            )}
                            onClick={sortable ? () => onSort(header.sortKey) : undefined}
                        >
                            {/* The chevron pair always follows the label (right-aligned numeric columns keep it
                                to the right of the label too). */}
                            <span className="inline-flex items-center gap-2">
                                {header.label}
                                {sortable && (
                                    <SortIndicator active={active} direction={active ? sortDirection : 'desc'} />
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
            {rows.map((tx, i) => (
                <BlockHistoryGridRow key={i} tx={tx} showComputeUnits={showComputeUnits} gridStyle={gridStyle} />
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
    const failed = Boolean(tx.meta?.err) || !tx.signature;
    const status = failed ? HISTORY_STATUS.failed : HISTORY_STATUS.success;
    const badge = (
        <Badge ui="dashkit" variant={status.variant}>
            {status.label}
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
            // Two-column grid so the "N ×" counters share one right-aligned column (any width) and every
            // program name lines up in the next — stays aligned no matter how large the count grows.
            // `tabular-nums` keeps multi-digit counts from jittering. Inline grid template so the
            // Storybook JIT can't purge it.
            <div className="grid items-center gap-x-1.5 gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr' }}>
                {entries.map(([programId, count]) => (
                    <React.Fragment key={programId}>
                        <span className="whitespace-nowrap text-right tabular-nums text-outer-space-300">
                            {count} ×
                        </span>
                        <Address pubkey={new PublicKey(programId)} link />
                    </React.Fragment>
                ))}
            </div>
        );

    // Signature with the Result badge to its right — mirroring the transaction-history card. On desktop the
    // invoked programs stack directly beneath it (`signatureBlock`); on mobile they move to their own
    // labelled "Programs" field, so here the header stays on its own.
    const signatureHeader = (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="min-w-0">{signatureNode}</span>
            {badge}
        </div>
    );
    const signatureBlock = (
        <div className="min-w-0">
            {signatureHeader}
            <div className="mt-1">{invokedNode}</div>
        </div>
    );

    return (
        <div className="border-b border-solid border-white/10 last:border-b-0">
            {/* Mobile — stacked, labelled rows matching the Overview card's key/value grid; the index sits
                in the top-right corner (like the transaction-page account card) and the invoked programs
                get their own labelled field. */}
            <div className="relative flex flex-col gap-1.5 px-4 py-3 md:hidden">
                <span className="absolute right-4 top-3 text-outer-space-300">#{tx.index + 1}</span>
                <BlockHistoryMobileField label="Signature">
                    <div className="pr-10">{signatureHeader}</div>
                </BlockHistoryMobileField>
                <BlockHistoryMobileField label="Fee">{feeNode}</BlockHistoryMobileField>
                {showComputeUnits && <BlockHistoryMobileField label="CUs Consumed">{compute}</BlockHistoryMobileField>}
                <BlockHistoryMobileField label="CUs Reserved">{reserved}</BlockHistoryMobileField>
                <BlockHistoryMobileField label="Cost">{txnCost}</BlockHistoryMobileField>
                <BlockHistoryMobileField label="Programs" align="start">
                    {invokedNode}
                </BlockHistoryMobileField>
            </div>

            {/* Desktop grid row. */}
            <div style={gridStyle} className="hidden items-start gap-4 px-4 py-3 md:grid">
                <div className="text-outer-space-300">{tx.index + 1}</div>
                {signatureBlock}
                <div className="text-right">{feeNode}</div>
                {showComputeUnits && <div className="text-right">{compute}</div>}
                <div className="text-right">{reserved}</div>
                <div className="text-right">{txnCost}</div>
            </div>
        </div>
    );
}

function BlockHistoryMobileField({
    label,
    children,
    align = 'baseline',
}: {
    label: string;
    children: React.ReactNode;
    align?: 'baseline' | 'start';
}) {
    // Label column width mirrors the Overview card's key/value grid so the two cards line up.
    return (
        <div
            className={cn(
                'grid grid-cols-[clamp(100px,25%,200px)_1fr] gap-2',
                align === 'start' ? 'items-start' : 'items-baseline',
            )}
        >
            <span className="text-outer-space-300">{label}</span>
            <span className="min-w-0">{children}</span>
        </div>
    );
}

const ALL_TRANSACTIONS = 'all';
const HIDE_VOTES = '';

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
        transactionCount: totalTransactionCount - (invokedPrograms.get(VOTE_PROGRAM_ID.toBase58()) || 0),
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

const FilterDropdown = ({
    options,
    currentFilter,
    isFilterSet,
}: {
    options: FilterOption[];
    currentFilter: string;
    isFilterSet: boolean;
}) => {
    const [query, setQuery] = React.useState('');
    const trimmed = query.trim().toLowerCase();
    const visibleOptions = trimmed === '' ? options : options.filter(o => o.name.toLowerCase().includes(trimmed));

    return (
        <Dropdown className="mr-1.5">
            <DropdownToggle asChild>
                {/* Icon-only below md; the label appears from md up. The dot marks an active filter. */}
                <Button ui="dashkit" variant="white" size="sm" type="button" className="relative" aria-label="Filters">
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
            </DropdownToggle>
            <DropdownMenu align="end" className="mt-0.5 w-[280px] !border-white/20">
                {/* `-mt-2` cancels the menu's base `py-2` (8px) above the field so the search box sits 10px
                    from every edge — otherwise the menu's top padding stacks with this container's. */}
                <div className="-mt-2 p-2.5">
                    <div className="relative">
                        <Search
                            size={13}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-outer-space-300"
                        />
                        <Input
                            variant="dark"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Program"
                            // Height comes from the base py-2.5 (10px) alone — a fixed height would add to
                            // the padding under Storybook's content-box (no Preflight) and read as > 10px.
                            className="!h-auto pl-8"
                        />
                    </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                    {visibleOptions.length === 0 ? (
                        <div className="px-6 py-1.5 text-dk-base text-dark-muted-foreground">No matches</div>
                    ) : (
                        visibleOptions.map(({ name, programId, transactionCount }) => (
                            <FilterLink
                                currentFilter={currentFilter}
                                key={programId}
                                name={name}
                                programId={programId}
                                transactionCount={transactionCount}
                            />
                        ))
                    )}
                </div>
            </DropdownMenu>
        </Dropdown>
    );
};

// The active filter shown as a removable chip below the block title. Clearing it resets to
// "All Transactions" (the "no filter" state), so the trailing param lands on `filter=all`.
function FilterChip({ label }: { label: string }) {
    const currentSearchParams = useSearchParams();
    const currentPathname = usePathname();
    const resetHref = useMemo(() => {
        const params = new URLSearchParams(currentSearchParams?.toString());
        params.set('filter', ALL_TRANSACTIONS);
        const nextQueryString = params.toString();
        return `${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
    }, [currentPathname, currentSearchParams]);

    return (
        <div className="inline-flex max-w-full items-center rounded-full border border-solid border-outer-space-800 bg-outer-space-900 py-0.5 pl-2.5 pr-0.5 text-sm text-white">
            <span className="mr-1.5 shrink-0 text-outer-space-300">Program</span>
            <span className="min-w-0 truncate">{label}</span>
            <Link
                href={resetHref}
                aria-label="Clear filter"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-outer-space-300 hover:bg-white/10 hover:text-white"
            >
                <X size={13} />
            </Link>
        </div>
    );
}

function FilterLink({
    currentFilter,
    name,
    programId,
    transactionCount,
}: {
    currentFilter: string;
    name: string;
    programId: string;
    transactionCount: number;
}) {
    const currentSearchParams = useSearchParams();
    const currentPathname = usePathname();
    const href = useMemo(() => {
        const params = new URLSearchParams(currentSearchParams?.toString());
        if (programId === HIDE_VOTES) {
            params.delete('filter');
        } else {
            params.set('filter', programId);
        }
        const nextQueryString = params.toString();
        return `${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
    }, [currentPathname, currentSearchParams, programId]);
    return (
        <DropdownItem
            asChild
            // Fixed-width menu: long program names wrap instead of widening it (override the base nowrap).
            className={cn('!whitespace-normal break-words', programId === currentFilter && 'active')}
            key={programId}
        >
            <Link href={href} className="relative">
                {programId === currentFilter && (
                    <span
                        aria-hidden
                        className="absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-current"
                    />
                )}
                {`${name} (${transactionCount})`}
            </Link>
        </DropdownItem>
    );
}
