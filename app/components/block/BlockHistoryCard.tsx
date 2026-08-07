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
import { ChevronDown } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
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
const TIGHT_CARD = 'overflow-hidden rounded-lg border-outer-space-800 bg-outer-space-900';

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
const useQuerySort = (query: ReadonlyURLSearchParams): SortMode => {
    const sort = query.get('sort');
    if (sort === 'compute') return 'compute';
    if (sort === 'txnCost') return 'txnCost';
    if (sort === 'fee') return 'fee';
    if (sort === 'reservedCUs') return 'reservedCUs';
    return 'index';
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
    const sortMode = useQuerySort(currentSearchParams);
    const router = useRouter();
    const { cluster } = useCluster();
    const buildClusterPath = useBuildClusterPath();

    // Sort is driven by a URL param; the grid variant's sortable headers push through here. Passing no
    // key clears the sort (the "#" header's reset back to index order). We build the URL from a copy of the
    // current params so a `delete` actually drops `sort` — `pickClusterParams` only ever adds/overrides
    // keys, so routing the reset through it would leave the stale `sort` in place.
    const pushSort = React.useCallback(
        (sortKey?: string) => {
            const nextParams = new URLSearchParams(currentSearchParams?.toString());
            if (sortKey) {
                nextParams.set('sort', sortKey);
            } else {
                nextParams.delete('sort');
            }
            const queryString = nextParams.toString();
            router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
        },
        [currentPathname, currentSearchParams, router],
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

        if (sortMode === 'compute' && showComputeUnits) {
            filteredTxs.sort((a, b) => (b.computeUnits ?? 0) - (a.computeUnits ?? 0));
        } else if (sortMode === 'txnCost') {
            filteredTxs.sort((a, b) => (b.costUnits ?? 0) - (a.costUnits ?? 0));
        } else if (sortMode === 'fee') {
            filteredTxs.sort((a, b) => (b.meta?.fee || 0) - (a.meta?.fee || 0));
        } else if (sortMode === 'reservedCUs') {
            filteredTxs.sort((a, b) => (b.reservedComputeUnits || 0) - (a.reservedComputeUnits || 0));
        }

        return [filteredTxs, showComputeUnits];
    }, [block.transactions, transactions, programFilter, accountFilter, sortMode]);

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
                title={title}
                className=""
                actions={
                    <FilterDropdown
                        filter={programFilter}
                        invokedPrograms={invokedPrograms}
                        totalTransactionCount={transactions.length}
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
                            <BlockHistoryGrid rows={visible} showComputeUnits={showComputeUnits} onSort={pushSort} />
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
                    filter={programFilter}
                    invokedPrograms={invokedPrograms}
                    totalTransactionCount={transactions.length}
                ></FilterDropdown>
            </CardHeader>

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
                            <BaseTable.HeaderCell className="cursor-pointer text-dk-gray-700" onClick={() => pushSort()}>

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

// Domains-card style — a CSS grid on md+, stacked labelled rows below md. Sortable numeric headers push
// the sort through `onSort` (same URL-param mechanism as the default table).
function BlockHistoryGrid({
    rows,
    showComputeUnits,
    onSort,
}: {
    rows: TransactionWithInvocations[];
    showComputeUnits: boolean;
    onSort: (sortKey?: string) => void;
}) {
    // Signature takes the slack; the numeric columns are capped tight (≈ content + ~1rem of headroom).
    // Inline (not a `grid-cols-[…]` class) so the Storybook JIT can't purge it. The Compute column only
    // exists when compute data is available. Following the transaction-history card, Result (badge) sits
    // inline with the signature and the invoked programs stack beneath it — so neither gets its own column.
    const gridStyle: React.CSSProperties = {
        gridTemplateColumns: `minmax(auto,2.5rem) minmax(0,1fr) minmax(auto,7rem) minmax(auto,6rem) ${
            showComputeUnits ? 'minmax(auto,6rem) ' : ''
        }minmax(auto,4rem)`,
    };

    const headers: { label: string; numeric?: boolean; onClick?: () => void }[] = [
        { label: '#', onClick: () => onSort() },
        { label: 'Signature / Programs' },
        { label: 'Fee', numeric: true, onClick: () => onSort('fee') },
        { label: 'CUs Reserved', numeric: true, onClick: () => onSort('reservedCUs') },
        ...(showComputeUnits ? [{ label: 'CUs Consumed', numeric: true, onClick: () => onSort('compute') }] : []),
        { label: 'Cost', numeric: true, onClick: () => onSort('txnCost') },
    ];

    return (
        <div className="text-sm text-white">
            <div
                style={gridStyle}
                className="hidden gap-4 border-b border-solid border-white/10 px-4 py-2.5 text-xs uppercase text-outer-space-300 md:grid"
            >
                {headers.map(header => (
                    <div
                        key={header.label}
                        className={cn(header.numeric && 'text-right', header.onClick && 'cursor-pointer select-none')}
                        onClick={header.onClick}
                    >
                        {header.label}
                    </div>
                ))}
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
                        <span className="whitespace-nowrap text-right tabular-nums text-outer-space-300">{count} ×</span>
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
                <BlockHistoryMobileField label="CUs Reserved">{reserved}</BlockHistoryMobileField>
                {showComputeUnits && <BlockHistoryMobileField label="CUs Consumed">{compute}</BlockHistoryMobileField>}
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
                <div className="text-right">{reserved}</div>
                {showComputeUnits && <div className="text-right">{compute}</div>}
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

type FilterProps = {
    filter: string;
    invokedPrograms: Map<string, number>;
    totalTransactionCount: number;
};

const ALL_TRANSACTIONS = 'all';
const HIDE_VOTES = '';

type FilterOption = {
    name: string;
    programId: string;
    transactionCount: number;
};

const FilterDropdown = ({ filter, invokedPrograms, totalTransactionCount }: FilterProps) => {
    const { cluster } = useCluster();
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

    let currentFilterOption = filter !== ALL_TRANSACTIONS ? defaultFilterOption : allTransactionsOption;

    const filterOptions: FilterOption[] = [defaultFilterOption, allTransactionsOption];

    invokedPrograms.forEach((transactionCount, programId) => {
        const name = displayAddress(programId, cluster);
        if (filter === programId) {
            currentFilterOption = {
                name: `${name} Transactions (${transactionCount})`,
                programId,
                transactionCount,
            };
        }
        filterOptions.push({ name, programId, transactionCount });
    });

    filterOptions.sort((a, b) => {
        if (a.transactionCount !== b.transactionCount) {
            return b.transactionCount - a.transactionCount;
        } else {
            return b.name > a.name ? -1 : 1;
        }
    });

    return (
        <Dropdown className="mr-1.5">
            <DropdownToggle asChild>
                <Button ui="dashkit" variant="white" size="sm" type="button">
                    {currentFilterOption.name} <ChevronDown className="align-text-top" size={13} />
                </Button>
            </DropdownToggle>
            <DropdownMenu align="end" className="max-h-80 overflow-y-auto !border-white/20">
                {filterOptions.map(({ name, programId, transactionCount }) => (
                    <FilterLink
                        currentFilter={filter}
                        key={programId}
                        name={name}
                        programId={programId}
                        transactionCount={transactionCount}
                    />
                ))}
            </DropdownMenu>
        </Dropdown>
    );
};

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
        if (name === HIDE_VOTES) {
            params.delete('filter');
        } else {
            params.set('filter', programId);
        }
        const nextQueryString = params.toString();
        return `${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
    }, [currentPathname, currentSearchParams, name, programId]);
    return (
        <DropdownItem asChild className={cn(programId === currentFilter && 'active')} key={programId}>
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
