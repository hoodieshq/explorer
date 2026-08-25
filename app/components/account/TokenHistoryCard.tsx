'use client';

import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { InstructionDetails } from '@components/common/InstructionDetails';
import { LoadingCard } from '@components/common/LoadingCard';
import { Signature } from '@components/common/Signature';
import { Slot } from '@components/common/Slot';
import {
    isTokenLendingInstruction,
    parseTokenLendingInstructionTitle,
} from '@components/instruction/token-lending/types';
import { isTokenSwapInstruction, parseTokenSwapInstructionTitle } from '@components/instruction/token-swap/types';
import { RawDataField } from '@components/shared/RawDataField';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { cn } from '@components/shared/utils';
import { useTokenInfo } from '@entities/token-info';
import { type ByteArray } from '@entities/transaction-data';
import { isMangoInstruction, parseMangoInstructionTitle } from '@explorer/decoder-mango/detection';
import { isSerumInstruction, parseSerumInstructionTitle } from '@explorer/decoder-serum/detection';
import { ProxiedImage } from '@features/metadata';
import { useAccountHistories } from '@features/transaction-history/model/use-account-history';
import { useFetchAccountHistory } from '@features/transaction-history/model/use-fetch-account-history';
import { useResolvedInstructionSummaries } from '@features/transaction-history/model/use-resolved-instruction-summaries';
import { InstructionListSkeleton } from '@features/transaction-history/ui/InstructionList';
import { isTokenProgramData } from '@providers/accounts';
import { isTokenProgramId, TokenInfoWithPubkey, useAccountOwnedTokens } from '@providers/accounts/tokens';
import { CacheEntry, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Details, useFetchTransactionDetails, useTransactionDetailsCache } from '@providers/transactions/parsed';
import { useFetchRawTransaction, useRawTransactionDetails } from '@providers/transactions/raw';
import { ConfirmedSignatureInfo, ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';
import { INNER_INSTRUCTIONS_START_SLOT } from '@utils/index';
import { getTokenProgramInstructionName, InstructionType } from '@utils/instruction';
import { displayAddress, intoTransactionInstruction, TokenLabelInfo } from '@utils/tx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback } from 'react';
import { ChevronDown, Code } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { INITIAL_TOKENS_TO_FETCH, INITIAL_VISIBLE_COUNT, LOAD_MORE_COUNT } from '@/app/features/token-history/config';
import { Logger } from '@/app/shared/lib/logger';
import { useVisibility } from '@/app/shared/lib/visibility';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { Card, CardFooter } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

const TRUNCATE_TOKEN_LENGTH = 10;
const ALL_TOKENS = '';

export type TokenHistoryLayout = 'table' | 'grid';

// Rendering variants for the tokens tab (see TokensTabView):
// - `default` — the layout-driven rendering (legacy table / grid).
// - `tx-history` — the PR #109 Transaction History grid: Signature (+ programs) / Time (UTC + age) / Token /
//   Block / Size (bytes, popover viewer).
// - `tx-history-compact` — same, trimmed: no Size column, no relative age, and Block moves under the
//   timestamp in a single "Time / Block" column.
export type TokenHistoryVariant = 'default' | 'tx-history' | 'tx-history-compact';

export function TokenHistoryCard({
    address,
    layout = 'table',
    variant = 'default',
}: {
    address: string;
    layout?: TokenHistoryLayout;
    variant?: TokenHistoryVariant;
}) {
    const ownedTokens = useAccountOwnedTokens(address);

    if (ownedTokens === undefined) {
        return null;
    }

    const tokens = ownedTokens.data?.tokens;
    if (tokens === undefined || tokens.length === 0) return null;

    if (tokens.length > 25) {
        return (
            <CollapsibleSection title="Token History" className="">
                <ErrorCard text="Token transaction history is not available for accounts with over 25 token accounts" />
            </CollapsibleSection>
        );
    }

    return <TokenHistoryTable tokens={tokens} layout={layout} variant={variant} />;
}

const useQueryFilter = (): string => {
    const searchParams = useSearchParams();
    const filter = searchParams?.get('filter');
    return filter || '';
};

type FilterProps = {
    filter: string;
    tokens: TokenInfoWithPubkey[];
};

function TokenHistoryTable({
    tokens,
    layout,
    variant,
}: {
    tokens: TokenInfoWithPubkey[];
    layout: TokenHistoryLayout;
    variant: TokenHistoryVariant;
}) {
    const accountHistories = useAccountHistories();
    const fetchAccountHistory = useFetchAccountHistory();
    const transactionDetailsCache = useTransactionDetailsCache();
    const [tokensToFetchCount, setTokensToFetchCount] = React.useState(INITIAL_TOKENS_TO_FETCH);
    const [visibleTxCount, setVisibleTxCount] = React.useState(INITIAL_VISIBLE_COUNT);
    const filter = useQueryFilter();

    const filteredTokens = React.useMemo(
        () =>
            tokens.filter(token => {
                if (filter === ALL_TOKENS) {
                    return true;
                }
                return token.info.mint.toBase58() === filter;
            }),
        [tokens, filter],
    );

    // Slice tokens - this controls what gets fetched
    const tokensToFetch = React.useMemo(
        () => filteredTokens.slice(0, tokensToFetchCount),
        [filteredTokens, tokensToFetchCount],
    );

    const fetchHistories = React.useCallback(
        (refresh?: boolean) => {
            tokensToFetch.forEach(token => {
                fetchAccountHistory(token.pubkey, false, refresh);
            });
        },
        [tokensToFetch, fetchAccountHistory],
    );

    // Fetch histories when tokensToFetch expands (user clicks Load More)
    const prevTokensToFetchCount = React.useRef(0);
    React.useEffect(() => {
        if (prevTokensToFetchCount.current < tokensToFetchCount) {
            // Only fetch newly added tokens
            const newTokens = tokensToFetch.slice(prevTokensToFetchCount.current);
            newTokens.forEach(token => {
                const address = token.pubkey.toBase58();
                if (!accountHistories[address]) {
                    fetchAccountHistory(token.pubkey, false, true);
                }
            });
            prevTokensToFetchCount.current = tokensToFetchCount;
        }
    }, [tokensToFetchCount, tokensToFetch, accountHistories, fetchAccountHistory]);

    const allFoundOldest = tokensToFetch.every(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.data?.foundOldest === true;
    });

    const allFetchedSome = tokensToFetch.every(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.data !== undefined;
    });

    // Find the oldest slot which we know we have the full history for
    let oldestSlot: number | undefined = allFoundOldest ? 0 : undefined;

    if (!allFoundOldest && allFetchedSome) {
        tokensToFetch.forEach(token => {
            const history = accountHistories[token.pubkey.toBase58()];
            if (history?.data?.foundOldest === false) {
                const earliest = history.data.fetched[history.data.fetched.length - 1].slot;
                if (!oldestSlot) oldestSlot = earliest;
                oldestSlot = Math.max(oldestSlot, earliest);
            }
        });
    }

    const fetching = tokensToFetch.some(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.status === FetchStatus.Fetching;
    });

    const failed = tokensToFetch.some(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.status === FetchStatus.FetchFailed;
    });

    const sigSet = new Set();
    const mintAndTxs = tokensToFetch
        .map(token => ({
            history: accountHistories[token.pubkey.toBase58()],
            mint: token.info.mint,
        }))
        .filter(({ history }) => {
            return history?.data?.fetched && history.data.fetched.length > 0;
        })
        .flatMap(({ mint, history }) =>
            (history?.data?.fetched as ConfirmedSignatureInfo[]).map(tx => ({
                mint,
                tx,
            })),
        )
        .filter(({ tx }) => {
            if (sigSet.has(tx.signature)) return false;
            sigSet.add(tx.signature);
            return true;
        })
        .filter(({ tx }) => {
            return oldestSlot !== undefined && tx.slot >= oldestSlot;
        });

    if (mintAndTxs.length === 0) {
        if (fetching) {
            // Keep the "Token History" heading visible while the first page loads instead of
            // collapsing to a bare LoadingCard.
            return (
                <CollapsibleSection title="Token History" className="">
                    <LoadingCard message="Loading history" />
                </CollapsibleSection>
            );
        } else if (failed) {
            return (
                <CollapsibleSection title="Token History" className="">
                    <ErrorCard retry={() => fetchHistories(true)} text="Failed to fetch transaction history" />
                </CollapsibleSection>
            );
        }
        if (tokensToFetchCount === 0) {
            return (
                <CollapsibleSection title="Token History" className="">
                    <Card ui="dashkit" marginBottom="none">
                        <CardFooter ui="dashkit" className="!p-3">
                            <Button
                                ui="dashkit"
                                variant="primary"
                                className="w-full"
                                onClick={() => setTokensToFetchCount(LOAD_MORE_COUNT)}
                            >
                                Load Token History
                            </Button>
                        </CardFooter>
                    </Card>
                </CollapsibleSection>
            );
        }
        return (
            <CollapsibleSection title="Token History" className="">
                <ErrorCard
                    retry={() => fetchHistories(true)}
                    retryText="Try again"
                    text="No transaction history found"
                />
            </CollapsibleSection>
        );
    }

    mintAndTxs.sort((a, b) => {
        if (a.tx.slot > b.tx.slot) return -1;
        if (a.tx.slot < b.tx.slot) return 1;
        return 0;
    });

    const visibleRows = mintAndTxs.slice(0, visibleTxCount);

    // Footer is identical across layouts: a Load/Show-More button, or the left-aligned
    // "Fetched full history" end-of-stream note. 12px padding all round (see !p-3).
    const footer = (
        <CardFooter ui="dashkit" className="!p-3">
            {visibleTxCount < mintAndTxs.length ? (
                <Button
                    ui="dashkit"
                    variant="primary"
                    className="w-full"
                    onClick={() => setVisibleTxCount(c => c + LOAD_MORE_COUNT)}
                >
                    {`Show More (${visibleTxCount} of ${mintAndTxs.length})`}
                </Button>
            ) : tokensToFetchCount < filteredTokens.length ? (
                <Button
                    ui="dashkit"
                    variant="primary"
                    className="w-full"
                    onClick={() => setTokensToFetchCount(c => c + LOAD_MORE_COUNT)}
                    disabled={fetching}
                >
                    {fetching ? (
                        <>
                            <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                            Loading
                        </>
                    ) : (
                        `Load More Token Accounts (${tokensToFetchCount} of ${filteredTokens.length})`
                    )}
                </Button>
            ) : allFoundOldest ? (
                <div className="text-left text-dk-gray-700">Fetched full history</div>
            ) : (
                <Button
                    ui="dashkit"
                    variant="primary"
                    className="w-full"
                    onClick={() => fetchHistories()}
                    disabled={fetching}
                >
                    {fetching ? (
                        <>
                            <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                            Loading
                        </>
                    ) : (
                        'Load More History'
                    )}
                </Button>
            )}
        </CardFooter>
    );

    return (
        <CollapsibleSection
            title="Token History"
            className=""
            actions={
                <>
                    <FilterDropdown filter={filter} tokens={tokens} />
                    <RefreshButton
                        analyticsSection="token_history_card"
                        onClick={() => fetchHistories(true)}
                        fetching={fetching}
                    />
                </>
            }
        >
            {variant === 'tx-history' ? (
                // Design variant: the rows rendered as the Transaction History CSS-grid from PR #109 —
                // Token / Transaction Signature (status badge + programs stacked under it) / Time (UTC + age)
                // / Block / Size (bytes). Same tight grid surface as the Token Holdings / Token History grid.
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    <TokenTxHistoryGrid rows={visibleRows} />
                    {footer}
                </Card>
            ) : variant === 'tx-history-compact' ? (
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    <TokenTxHistoryGridCompact rows={visibleRows} />
                    {footer}
                </Card>
            ) : layout === 'grid' ? (
                // Surface matched to the Token Holdings grid: tight card, 8px radius, outer-space border.
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    <TokenHistoryGrid rows={visibleRows} detailsCache={transactionDetailsCache} />
                    {footer}
                </Card>
            ) : (
                <Card ui="dashkit" marginBottom="none">
                    <BaseTable ui="dashkit" variant="card" nowrap>
                        <BaseTable.Head>
                            <BaseTable.Row>
                                <BaseTable.HeaderCell className="w-px text-dk-gray-700">Slot</BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="text-dk-gray-700">Result</BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="text-dk-gray-700">Token</BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="text-dk-gray-700">
                                    Instruction Type
                                </BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="text-dk-gray-700">
                                    Transaction Signature
                                </BaseTable.HeaderCell>
                            </BaseTable.Row>
                        </BaseTable.Head>
                        <BaseTable.Body>
                            {visibleRows.map(({ mint, tx }) => (
                                <TokenTransactionRow
                                    key={tx.signature}
                                    mint={mint}
                                    tx={tx}
                                    details={transactionDetailsCache[tx.signature]}
                                />
                            ))}
                        </BaseTable.Body>
                    </BaseTable>
                    {footer}
                </Card>
            )}
        </CollapsibleSection>
    );
}

// Resolves one mint's label through the shared token-info batch provider (the same cache the holdings rows use).
// Fetches on mount and coalesces with the holdings fetch into one batched POST.
// The cache-aware provider then skips this mint on any later re-request (filter change, holdings Load More).
function TokenFilterLabel({ mint }: { mint: string }) {
    const { cluster, genesisHash } = useCluster();
    const info = useTokenInfo(true, mint, cluster, genesisHash);
    return <>{formatTokenName(mint, cluster, info)}</>;
}

export function FilterDropdown({ filter, tokens }: FilterProps) {
    const currentSearchParams = useSearchParams();
    const currentPathname = usePathname();
    const buildLocation = useCallback(
        (filter: string) => {
            const params = new URLSearchParams(currentSearchParams?.toString());
            if (filter === ALL_TOKENS) {
                params.delete('filter');
            } else {
                params.set('filter', filter);
            }
            const nextQueryString = params.toString();
            return `${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
        },
        [currentPathname, currentSearchParams],
    );

    const filterOptions = React.useMemo(
        () => [ALL_TOKENS, ...new Set(tokens.map(token => token.info.mint.toBase58()))],
        [tokens],
    );

    return (
        <Dropdown className="mr-1.5">
            <small className="mr-1.5">Filter:</small>
            <DropdownToggle asChild>
                <Button ui="dashkit" variant="white" size="sm" type="button">
                    {filter === ALL_TOKENS ? 'All Tokens' : <TokenFilterLabel mint={filter} />}{' '}
                    <ChevronDown size={15} className="align-text-top" />
                </Button>
            </DropdownToggle>
            <DropdownMenu align="end" className="max-h-80 overflow-y-auto">
                {filterOptions.map(filterOption => {
                    return (
                        <DropdownItem asChild key={filterOption} className={cn(filterOption === filter && 'active')}>
                            <Link href={buildLocation(filterOption)}>
                                {filterOption === ALL_TOKENS ? 'All Tokens' : <TokenFilterLabel mint={filterOption} />}
                            </Link>
                        </DropdownItem>
                    );
                })}
            </DropdownMenu>
        </Dropdown>
    );
}

const TokenTransactionRow = React.memo(function TokenTransactionRow({
    mint,
    tx,
    details,
}: {
    mint: PublicKey;
    tx: ConfirmedSignatureInfo;
    details: CacheEntry<Details> | undefined;
}) {
    let statusText: string;
    let statusClass: 'success' | 'warning';
    if (tx.err) {
        statusClass = 'warning';
        statusText = 'Failed';
    } else {
        statusClass = 'success';
        statusText = 'Success';
    }

    return (
        <tr key={tx.signature}>
            <td className="w-px">
                <Slot slot={tx.slot} link />
            </td>

            <td>
                <Badge ui="dashkit" variant={statusClass}>
                    {statusText}
                </Badge>
            </td>

            <td>
                <Address pubkey={mint} link />
            </td>

            <InstructionDetailsCell signature={tx.signature} details={details} tx={tx} />

            <td>
                <Signature signature={tx.signature} link />
            </td>
        </tr>
    );
});

// Success / Failed badge, shared by the grid signature cell and the legacy table.
function TxStatusBadge({ err }: { err: ConfirmedSignatureInfo['err'] }) {
    return err ? (
        <Badge ui="dashkit" variant="warning">
            Failed
        </Badge>
    ) : (
        <Badge ui="dashkit" variant="success">
            Success
        </Badge>
    );
}

// `tx-history` variant grid: the token-history rows rendered as the PR #109 Transaction History CSS-grid.
// Programs stack under the signature via the real Transaction History InstructionsCell (so they resolve and
// render identically); the byte size is read from the lazily-fetched raw tx. Columns: Transaction Signature
// (+ status badge, programs) / Time (UTC + age) / Token / Block / Size (bytes). The Time column collapses
// when no visible row carries a blockTime. Below `md` each row becomes a labels-left block, matching the
// other grids on the tokens tab.
type TxHistoryRowProps = {
    mint: PublicKey;
    tx: ConfirmedSignatureInfo;
    hasTimestamps: boolean;
};

// Signature / Time / Token / Block / Size. Time is a flexible fr track (not `auto`): the full UTC
// timestamp is wide, and an `auto` track would let it outgrow the 1.4fr Signature column as the grid
// narrows. As a fr track it shares slack proportionally and its text wraps instead (see the Time cell).
const TX_HISTORY_GRID_TEMPLATE = 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]';
const TX_HISTORY_GRID_TEMPLATE_NO_TIME = 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]';
// Top-aligned body cell: rows vary in height (programs stack under the signature, Time is two lines), so
// every cell hugs the top rather than centering.
const txHistoryBodyCell = 'flex items-start border-t border-solid border-outer-space-800 px-3 py-3';

function TokenTxHistoryGrid({ rows }: { rows: { mint: PublicKey; tx: ConfirmedSignatureInfo }[] }) {
    const hasTimestamps = rows.some(({ tx }) => Boolean(tx.blockTime));

    return (
        <>
            {/* Mobile (< md): labels-left list. */}
            <div className="md:hidden">
                {rows.map(({ mint, tx }) => (
                    <MobileTxHistoryRow key={tx.signature} mint={mint} tx={tx} hasTimestamps={hasTimestamps} />
                ))}
            </div>

            {/* Desktop (md+): CSS-grid table; `contents` row wrappers keep ARIA structure without breaking
                the grid column alignment. */}
            <div className="hidden w-full text-sm text-white md:block">
                <div
                    role="table"
                    aria-label="Token history"
                    className={cn(
                        'grid w-full',
                        hasTimestamps ? TX_HISTORY_GRID_TEMPLATE : TX_HISTORY_GRID_TEMPLATE_NO_TIME,
                    )}
                >
                    <div role="row" className="contents">
                        <div role="columnheader" className={historyHeaderCell}>
                            Transaction Signature
                        </div>
                        {hasTimestamps && (
                            <div role="columnheader" className={historyHeaderCell}>
                                Time
                            </div>
                        )}
                        <div role="columnheader" className={historyHeaderCell}>
                            Token
                        </div>
                        <div role="columnheader" className={historyHeaderCell}>
                            Block
                        </div>
                        <div role="columnheader" className={historyHeaderCell}>
                            Size (bytes)
                        </div>
                    </div>
                    {rows.map(({ mint, tx }) => (
                        <GridTxHistoryRow key={tx.signature} mint={mint} tx={tx} hasTimestamps={hasTimestamps} />
                    ))}
                </div>
            </div>
        </>
    );
}

// Token column content: mint logo + linked address, styled like the Token Holdings mobile row — a 24px
// round icon (its 4px border blends the edge into the row background) sitting just before the address, with
// the same lazily-batched useTokenInfo enrichment feeding both the logo and the address label.
function TokenCell({ mint }: { mint: PublicKey }) {
    const { cluster, genesisHash } = useCluster();
    const tokenInfo = useTokenInfo(true, mint.toBase58(), cluster, genesisHash);

    return (
        <div className="flex min-w-0 flex-1 items-center gap-2">
            <ProxiedImage
                alt="Token icon"
                className="-my-0.5 h-6 w-6 shrink-0 rounded-full border-4 border-solid border-dk-gray-700-dark"
                height={16}
                uri={tokenInfo?.logoURI ?? undefined}
                width={16}
            />
            <div className="min-w-0 flex-1">
                <Address pubkey={mint} link tokenLabelInfo={tokenInfo} />
            </div>
        </div>
    );
}

function GridTxHistoryRow({ mint, tx, hasTimestamps }: TxHistoryRowProps) {
    return (
        <div role="row" className="contents">
            <div role="cell" className={cn(txHistoryBodyCell, 'min-w-0 flex-col gap-1 overflow-hidden')}>
                <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                        <Signature signature={tx.signature} link />
                    </div>
                    <span className="shrink-0">
                        <TxStatusBadge err={tx.err} />
                    </span>
                </div>
                <TokenProgramsCell signature={tx.signature} />
            </div>
            {hasTimestamps && (
                <div role="cell" className={cn(txHistoryBodyCell, 'min-w-0 flex-col')}>
                    {tx.blockTime ? (
                        <>
                            <span>{displayTimestampUtc(unixTimestampToMs(tx.blockTime), true)}</span>
                            <span className="text-outer-space-300">
                                <RelativeTime date={unixTimestampToMs(tx.blockTime)} />
                            </span>
                        </>
                    ) : (
                        '---'
                    )}
                </div>
            )}
            <div role="cell" className={cn(txHistoryBodyCell, 'min-w-0 overflow-hidden')}>
                <TokenCell mint={mint} />
            </div>
            <div role="cell" className={cn(txHistoryBodyCell, 'whitespace-nowrap')}>
                <Slot slot={tx.slot} link />
            </div>
            <div role="cell" className={cn(txHistoryBodyCell, 'whitespace-nowrap')}>
                <RawSizeCell signature={tx.signature} />
            </div>
        </div>
    );
}

function MobileTxHistoryRow({ mint, tx, hasTimestamps }: TxHistoryRowProps) {
    return (
        <div className="flex flex-col gap-1 border-t border-solid border-outer-space-800 px-3 py-3 text-sm text-white first:border-t-0">
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Signature</span>
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    <div className="min-w-0">
                        <Signature signature={tx.signature} link />
                    </div>
                    <span className="shrink-0">
                        <TxStatusBadge err={tx.err} />
                    </span>
                </div>
            </div>
            {hasTimestamps && tx.blockTime && (
                <div className="flex items-start gap-2">
                    <span className="w-28 shrink-0 text-outer-space-300">Time</span>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span>{displayTimestampUtc(unixTimestampToMs(tx.blockTime), true)}</span>
                        <span className="text-outer-space-300">
                            <RelativeTime date={unixTimestampToMs(tx.blockTime)} />
                        </span>
                    </div>
                </div>
            )}
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Token</span>
                <TokenCell mint={mint} />
            </div>
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Block</span>
                <div className="min-w-0 flex-1">
                    <Slot slot={tx.slot} link />
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Size (bytes)</span>
                <div className="min-w-0 flex-1">
                    <RawSizeCell signature={tx.signature} />
                </div>
            </div>
            {/* Programs last on mobile (they carry the most vertical content). */}
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Programs</span>
                <div className="min-w-0 flex-1 overflow-hidden">
                    <TokenProgramsCell signature={tx.signature} />
                </div>
            </div>
        </div>
    );
}

const INLINE_PROGRAMS_LIMIT = 3;

// Program list under the signature. The first few render inline; the rest collapse behind a "+N more"
// toggle that expands them IN PLACE on click (no hover tooltip). Same lazy, on-visible fetch + skeleton as
// the shared InstructionsCell — only the overflow rendering differs, so this stays local to the variant.
function TokenProgramsCell({ signature }: { signature: string }) {
    const { isVisible, ref } = useVisibility<HTMLDivElement>(true);
    const instructions = useResolvedInstructionSummaries(signature, isVisible);
    const [expanded, setExpanded] = React.useState(false);

    if (instructions === undefined) {
        return (
            <div ref={ref}>
                <InstructionListSkeleton />
            </div>
        );
    }
    if (instructions.length === 0) {
        return <div ref={ref} />;
    }

    const visible = expanded ? instructions : instructions.slice(0, INLINE_PROGRAMS_LIMIT);
    const overflow = instructions.length - INLINE_PROGRAMS_LIMIT;

    return (
        <div ref={ref} className="mt-1 flex flex-col">
            {visible.map((instruction, i) => (
                <span key={i} className="text-sm">
                    <span className="text-muted">{instruction.program}: </span>
                    <span className="text-white">{instruction.name}</span>
                </span>
            ))}
            {overflow > 0 && (
                // A span (not a <button>): the app has no Tailwind Preflight, so a bare <button> keeps its
                // native chrome and the utility classes read as "not applied". role/tabIndex restore the
                // button semantics, matching the InstructionList / InstructionTypeContent idiom.
                <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(e => !e)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpanded(prev => !prev);
                        }
                    }}
                    className="mt-0.5 cursor-pointer self-start text-xs text-muted hover:text-white"
                >
                    {expanded ? 'Show less' : `+${overflow} more`}
                </span>
            )}
        </div>
    );
}

// Message byte size, read from the lazily-fetched raw tx. Fetched on mount so the count shows without
// interaction; the same bytes feed the expandable RawDataField viewer.
function useRawTxBytes(signature: string): { bytes: ByteArray | undefined; loading: boolean } {
    const fetchRaw = useFetchRawTransaction();
    const rawDetails = useRawTransactionDetails(signature);
    const bytes = rawDetails?.data?.raw?.messageBytes;
    const loading = rawDetails === undefined || rawDetails.status === FetchStatus.Fetching;

    React.useEffect(() => {
        if (!bytes && rawDetails === undefined) fetchRaw(signature);
    }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

    return { bytes, loading };
}

// Size (bytes) cell: the byte count (with a code glyph) opens the RawDataField viewer in a popover — the
// same trigger→popover→RawDataField pattern the transaction page uses for account data (AccountExpandedContent).
function RawSizeCell({ signature }: { signature: string }) {
    const { bytes, loading } = useRawTxBytes(signature);

    if (!bytes) {
        return loading ? <Skeleton className="h-3.5 w-10" /> : <span className="text-outer-space-300">---</span>;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="h-auto !items-baseline gap-1 !p-0 !text-sm font-medium text-white">
                    <Code size={12} />
                    <span>{bytes.length}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto !rounded-lg border-none p-0" align="end">
                <RawDataField data={bytes} filename={signature} loading={loading} />
            </PopoverContent>
        </Popover>
    );
}

// `tx-history-compact` variant grid (2.2): the tx-history grid trimmed to three columns — Transaction
// Signature (+ status badge, programs) / Time / Block (UTC timestamp with the block number beneath it, no
// relative age) / Token. No Size column. Reuses the same cells as the full tx-history grid.
const TX_HISTORY_COMPACT_TEMPLATE = 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]';

function TokenTxHistoryGridCompact({ rows }: { rows: { mint: PublicKey; tx: ConfirmedSignatureInfo }[] }) {
    return (
        <>
            {/* Mobile (< md): labels-left list. */}
            <div className="md:hidden">
                {rows.map(({ mint, tx }) => (
                    <MobileTxCompactRow key={tx.signature} mint={mint} tx={tx} />
                ))}
            </div>

            {/* Desktop (md+): CSS-grid table. */}
            <div className="hidden w-full text-sm text-white md:block">
                <div role="table" aria-label="Token history" className={cn('grid w-full', TX_HISTORY_COMPACT_TEMPLATE)}>
                    <div role="row" className="contents">
                        <div role="columnheader" className={historyHeaderCell}>
                            Transaction Signature
                        </div>
                        <div role="columnheader" className={historyHeaderCell}>
                            Time / Block
                        </div>
                        <div role="columnheader" className={historyHeaderCell}>
                            Token
                        </div>
                    </div>
                    {rows.map(({ mint, tx }) => (
                        <GridTxCompactRow key={tx.signature} mint={mint} tx={tx} />
                    ))}
                </div>
            </div>
        </>
    );
}

function GridTxCompactRow({ mint, tx }: { mint: PublicKey; tx: ConfirmedSignatureInfo }) {
    return (
        <div role="row" className="contents">
            <div role="cell" className={cn(txHistoryBodyCell, 'min-w-0 flex-col gap-1 overflow-hidden')}>
                <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                        <Signature signature={tx.signature} link />
                    </div>
                    <span className="shrink-0">
                        <TxStatusBadge err={tx.err} />
                    </span>
                </div>
                <TokenProgramsCell signature={tx.signature} />
            </div>
            <div role="cell" className={cn(txHistoryBodyCell, 'min-w-0 flex-col gap-0.5')}>
                {tx.blockTime && <span>{displayTimestampUtc(unixTimestampToMs(tx.blockTime), true)}</span>}
                <Slot slot={tx.slot} link />
            </div>
            <div role="cell" className={cn(txHistoryBodyCell, 'min-w-0 overflow-hidden')}>
                <TokenCell mint={mint} />
            </div>
        </div>
    );
}

function MobileTxCompactRow({ mint, tx }: { mint: PublicKey; tx: ConfirmedSignatureInfo }) {
    return (
        <div className="flex flex-col gap-1 border-t border-solid border-outer-space-800 px-3 py-3 text-sm text-white first:border-t-0">
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Signature</span>
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    <div className="min-w-0">
                        <Signature signature={tx.signature} link />
                    </div>
                    <span className="shrink-0">
                        <TxStatusBadge err={tx.err} />
                    </span>
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Time / Block</span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {tx.blockTime && <span>{displayTimestampUtc(unixTimestampToMs(tx.blockTime), true)}</span>}
                    <Slot slot={tx.slot} link />
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Token</span>
                <TokenCell mint={mint} />
            </div>
            {/* Programs last on mobile (they carry the most vertical content). */}
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Programs</span>
                <div className="min-w-0 flex-1 overflow-hidden">
                    <TokenProgramsCell signature={tx.signature} />
                </div>
            </div>
        </div>
    );
}

// Grid rendering of the history rows, mirroring the transaction Accounts/Token Balances tables and the
// Token Holdings grid. Columns in order: Signature (with the status badge folded into the cell after it),
// Instruction Type, Token, Slot. Below `sm` each row collapses to a labels-left block.
//
// Instruction Type and Slot are fixed-width; Signature and Token split the remaining width equally
// (`minmax(0,1fr)` each — the `0` min lets their mid-truncating content shrink instead of widening the
// grid past the container and forcing a horizontal scrollbar). The Slot track is sized to hold a
// comma-grouped slot number plus Copyable's inline copy icon: a too-narrow fixed track let the
// `whitespace-nowrap` number spill past the grid, where the card's overflow clipped it.
const HISTORY_GRID_TEMPLATE = 'grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_160px]';
const historyHeaderCell = 'flex items-center px-3 py-2.5 text-xs uppercase text-outer-space-300';
const historyBodyCell = 'flex items-center border-t border-solid border-outer-space-800 px-3 py-2.5';

type HistoryRowProps = {
    mint: PublicKey;
    tx: ConfirmedSignatureInfo;
    details: CacheEntry<Details> | undefined;
};

function TokenHistoryGrid({
    rows,
    detailsCache,
}: {
    rows: { mint: PublicKey; tx: ConfirmedSignatureInfo }[];
    detailsCache: Record<string, CacheEntry<Details>>;
}) {
    return (
        <>
            {/* Mobile (< md): labels-left list. */}
            <div className="md:hidden">
                {rows.map(({ mint, tx }) => (
                    <MobileHistoryRow key={tx.signature} mint={mint} tx={tx} details={detailsCache[tx.signature]} />
                ))}
            </div>

            {/* Desktop (md+): CSS-grid table; `contents` row wrappers keep ARIA structure without breaking
                the grid column alignment. */}
            <div className="hidden w-full text-sm text-white md:block">
                <div role="table" aria-label="Token history" className={cn('grid w-full', HISTORY_GRID_TEMPLATE)}>
                    <div role="row" className="contents">
                        <div role="columnheader" className={historyHeaderCell}>
                            Signature
                        </div>
                        <div role="columnheader" className={historyHeaderCell}>
                            Instruction Type
                        </div>
                        <div role="columnheader" className={historyHeaderCell}>
                            Token
                        </div>
                        <div role="columnheader" className={historyHeaderCell}>
                            Slot
                        </div>
                    </div>
                    {rows.map(({ mint, tx }) => (
                        <GridHistoryRow key={tx.signature} mint={mint} tx={tx} details={detailsCache[tx.signature]} />
                    ))}
                </div>
            </div>
        </>
    );
}

function GridHistoryRow({ mint, tx, details }: HistoryRowProps) {
    return (
        <div role="row" className="contents">
            <div role="cell" className={cn(historyBodyCell, 'min-w-0 gap-2 overflow-hidden')}>
                {/* No flex-1: the wrapper hugs the (fixed, mid-truncated) signature so the badge sits
                    directly after it instead of being pushed to the far edge of the 1fr column. */}
                <div className="min-w-0">
                    <Signature signature={tx.signature} link />
                </div>
                <span className="shrink-0">
                    <TxStatusBadge err={tx.err} />
                </span>
            </div>
            <div role="cell" className={cn(historyBodyCell, 'min-w-0 flex-wrap gap-1')}>
                <InstructionTypeContent signature={tx.signature} details={details} tx={tx} />
            </div>
            <div role="cell" className={cn(historyBodyCell, 'min-w-0 overflow-hidden')}>
                <Address pubkey={mint} link />
            </div>
            <div role="cell" className={cn(historyBodyCell, 'whitespace-nowrap')}>
                <Slot slot={tx.slot} link />
            </div>
        </div>
    );
}

function MobileHistoryRow({ mint, tx, details }: HistoryRowProps) {
    return (
        <div className="flex flex-col gap-1 border-t border-solid border-outer-space-800 px-3 py-3 text-sm text-white first:border-t-0">
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Signature</span>
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    <div className="min-w-0">
                        <Signature signature={tx.signature} link />
                    </div>
                    <span className="shrink-0">
                        <TxStatusBadge err={tx.err} />
                    </span>
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Instruction Type</span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                    <InstructionTypeContent signature={tx.signature} details={details} tx={tx} />
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Token</span>
                <div className="min-w-0 flex-1 overflow-hidden">
                    <Address pubkey={mint} link />
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-28 shrink-0 text-outer-space-300">Slot</span>
                <div className="min-w-0 flex-1">
                    <Slot slot={tx.slot} link />
                </div>
            </div>
        </div>
    );
}

function formatTokenName(pubkey: string, cluster: Cluster, tokenInfo?: TokenLabelInfo): string {
    let display = displayAddress(pubkey, cluster, tokenInfo);

    if (display === pubkey) {
        display = `${display.slice(0, TRUNCATE_TOKEN_LENGTH)}\u2026`;
    }

    return display;
}

function InstructionTypeContent({
    signature,
    details,
    tx,
}: {
    signature: string;
    details: CacheEntry<Details> | undefined;
    tx: ConfirmedSignatureInfo;
}) {
    const fetchDetails = useFetchTransactionDetails();
    const { cluster } = useCluster();

    const handleLoadClick = React.useCallback(() => {
        fetchDetails(signature);
    }, [fetchDetails, signature]);

    const isFetching = details?.status === FetchStatus.Fetching;
    const hasFailed = details?.status === FetchStatus.FetchFailed;
    const transactionWithMeta = details?.data?.transactionWithMeta;
    const instructions = transactionWithMeta?.transaction.message.instructions;

    if (!details) {
        return (
            <Button ui="dashkit" variant="outline-primary" size="sm" className="px-[3px] py-0 leading-none" asChild>
                <span role="button" onClick={handleLoadClick}>
                    Load
                </span>
            </Button>
        );
    }

    if (isFetching) {
        return (
            <>
                <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                Loading
            </>
        );
    }

    if (hasFailed || !instructions) {
        return (
            <Button ui="dashkit" variant="outline-warning" size="sm" className="px-[3px] py-0 leading-none" asChild>
                <span role="button" onClick={handleLoadClick}>
                    Retry
                </span>
            </Button>
        );
    }

    const tokenInstructionNames = instructions
        .map((ix, index): InstructionType | undefined => {
            let name = 'Unknown';

            const innerInstructions: (ParsedInstruction | PartiallyDecodedInstruction)[] = [];

            if (
                transactionWithMeta.meta?.innerInstructions &&
                (cluster !== Cluster.MainnetBeta || transactionWithMeta.slot >= INNER_INSTRUCTIONS_START_SLOT)
            ) {
                transactionWithMeta.meta.innerInstructions.forEach(innerIx => {
                    if (innerIx.index === index) {
                        innerIx.instructions.forEach(inner => {
                            innerInstructions.push(inner);
                        });
                    }
                });
            }

            let transactionInstruction;
            if (transactionWithMeta?.transaction) {
                transactionInstruction = intoTransactionInstruction(transactionWithMeta.transaction, ix);
            }

            if ('parsed' in ix) {
                if (isTokenProgramData(ix)) {
                    name = getTokenProgramInstructionName(ix, tx);
                } else {
                    return undefined;
                }
            } else if (transactionInstruction && isSerumInstruction(transactionInstruction)) {
                try {
                    name = parseSerumInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else if (transactionInstruction && isTokenSwapInstruction(transactionInstruction)) {
                try {
                    name = parseTokenSwapInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else if (transactionInstruction && isTokenLendingInstruction(transactionInstruction)) {
                try {
                    name = parseTokenLendingInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else if (transactionInstruction && isMangoInstruction(transactionInstruction)) {
                try {
                    name = parseMangoInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else {
                if (ix.accounts.findIndex(account => isTokenProgramId(account)) >= 0) {
                    name = 'Unknown (Inner)';
                } else {
                    return undefined;
                }
            }

            return {
                innerInstructions,
                name,
            };
        })
        .filter((item): item is InstructionType => item !== undefined);

    return (
        <>
            {tokenInstructionNames.map((instructionType, index) => (
                <InstructionDetails key={index} instructionType={instructionType} tx={tx} />
            ))}
        </>
    );
}

// Legacy table wrapper: the same content inside a <td> for the dashkit <table> body.
function InstructionDetailsCell(props: {
    signature: string;
    details: CacheEntry<Details> | undefined;
    tx: ConfirmedSignatureInfo;
}) {
    return (
        <td>
            <InstructionTypeContent {...props} />
        </td>
    );
}
