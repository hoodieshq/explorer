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
import { useTokenInfos } from '@entities/token-info/client';
import { type InstructionSummary, trustedInnerInstructions } from '@entities/transaction-data';
import { isMangoInstruction, parseMangoInstructionTitle } from '@explorer/decoder-mango/detection';
import { isSerumInstruction, parseSerumInstructionTitle } from '@explorer/decoder-serum/detection';
import { ProxiedImage } from '@features/metadata';
import {
    type HistoryStatus,
    isHistoryStatus,
    STATUS_LABELS,
    STATUS_PARAM,
    STATUS_VALUES,
} from '@features/transaction-history/lib/history-filters';
import { useAccountHistories } from '@features/transaction-history/model/use-account-history';
import { useFetchAccountHistory } from '@features/transaction-history/model/use-fetch-account-history';
import { useResolvedInstructionSummaries } from '@features/transaction-history/model/use-resolved-instruction-summaries';
import { STATUS_BADGE } from '@features/transaction-history/ui/BaseTransactionHistoryCard';
import { InstructionListSkeleton } from '@features/transaction-history/ui/InstructionList';
import { TransactionDetailsDrawer } from '@features/transaction-history/ui/TransactionDetailsDrawer';
import { isTokenProgramData } from '@providers/accounts';
import { isTokenProgramId, TokenInfoWithPubkey, useAccountOwnedTokens } from '@providers/accounts/tokens';
import { CacheEntry, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Details, useFetchTransactionDetails, useTransactionDetailsCache } from '@providers/transactions/parsed';
import { useFetchRawTransaction, useRawTransactionDetails } from '@providers/transactions/raw';
import { ConfirmedSignatureInfo, ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';
import { getTokenProgramInstructionName, InstructionType } from '@utils/instruction';
import { displayAddress, intoTransactionInstruction, TokenLabelInfo } from '@utils/tx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { Code, Filter, Search, X } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { Input } from '@/app/components/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { type ByteArray } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';
import { useVisibility } from '@/app/shared/lib/visibility';
import { toKitAddress } from '@/app/shared/lib/web3js-compat';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { Card, CardFooter } from '@/app/shared/ui/Card';
import { DataListRow } from '@/app/shared/ui/DataListCard';
import { ROW_PADDING } from '@/app/shared/ui/spacing';
import { BaseTable } from '@/app/shared/ui/Table';

const TRUNCATE_TOKEN_LENGTH = 10;

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

// URL param holding the mints Token History is filtered to, one repeated `filter=<mint>` per mint (so a
// single-mint link from before multi-select still reads the same). The Token Holdings rows' filter toggle
// writes it too, through `toggleTokenHistoryFilter`.
export const TOKEN_HISTORY_FILTER_PARAM = 'filter';

export function readTokenHistoryFilter(params: Pick<URLSearchParams, 'getAll'> | null): string[] {
    return [...new Set(params?.getAll(TOKEN_HISTORY_FILTER_PARAM).filter(Boolean) ?? [])];
}

// Adds the mint to the filter, or removes it when it is already there; an emptied filter drops the param.
export function toggleTokenHistoryFilter(params: URLSearchParams, mint: string): void {
    const mints = readTokenHistoryFilter(params);
    const next = mints.includes(mint) ? mints.filter(selected => selected !== mint) : [...mints, mint];
    params.delete(TOKEN_HISTORY_FILTER_PARAM);
    next.forEach(selected => params.append(TOKEN_HISTORY_FILTER_PARAM, selected));
}

const useQueryTokenFilter = (): string[] => {
    const searchParams = useSearchParams();
    const key = readTokenHistoryFilter(searchParams).join(',');
    // Keyed on the joined value so the array identity only changes when the selection does.
    return useMemo(() => (key === '' ? [] : key.split(',')), [key]);
};

// Same `status` URL param and values as the block transactions list and the address history.
const useQueryStatus = (): HistoryStatus | null => {
    const searchParams = useSearchParams();
    const status = searchParams?.get(STATUS_PARAM);
    return status && isHistoryStatus(status) ? status : null;
};

// Rows shown up front, and how many more each "Load More" asks for. Also the per-account page size: the
// newest PAGE_SIZE rows can all come from one token account, so each account's first page must hold as many.
const PAGE_SIZE = 20;
// How many history pages the card fetches on its own to fill a page of rows before it stops and leaves
// the rest to "Load More". A rare status (a wallet with no failures, filtered to Failed) would otherwise
// walk every account's entire history unattended.
const AUTO_FILL_ROUNDS = 5;

type Paging = { key: string; target: number; rounds: number };

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
    const fetchAccountHistory = useFetchAccountHistory(PAGE_SIZE);
    const transactionDetailsCache = useTransactionDetailsCache();
    const mints = useQueryTokenFilter();
    const status = useQueryStatus();

    // The token filter picks which accounts' histories are fetched, so it applies to each chosen account's
    // whole history rather than to the rows already on screen.
    const filteredTokens = React.useMemo(() => {
        if (mints.length === 0) return tokens;
        const selected = new Set(mints);
        return tokens.filter(token => selected.has(token.info.mint.toBase58()));
    }, [tokens, mints]);

    // `target` is how many rows the card wants on screen; `rounds` counts the pages it has fetched on its own
    // toward it. A filter change starts both over (adjusted during render, React's pattern for resetting
    // state on a prop change).
    const filtersKey = `${mints.join(',')}|${status ?? ''}`;
    const [paging, setPaging] = React.useState<Paging>({ key: filtersKey, rounds: 0, target: PAGE_SIZE });
    if (paging.key !== filtersKey) {
        setPaging({ key: filtersKey, rounds: 0, target: PAGE_SIZE });
    }

    // A refresh refetches every account's newest page; otherwise this pages on, skipping accounts whose whole
    // history is already in.
    const fetchHistories = React.useCallback(
        (refresh?: boolean) => {
            filteredTokens.forEach(token => {
                if (!refresh && accountHistories[token.pubkey.toBase58()]?.data?.foundOldest) return;
                fetchAccountHistory(toKitAddress(token.pubkey), false, refresh);
            });
        },
        [filteredTokens, accountHistories, fetchAccountHistory],
    );

    // First page for every account in the filter that has no history yet — on mount, and whenever the filter
    // brings in a new account. Accounts already cached (or in flight) are left alone.
    React.useEffect(() => {
        filteredTokens.forEach(token => {
            if (!accountHistories[token.pubkey.toBase58()]) {
                fetchAccountHistory(toKitAddress(token.pubkey), false, true);
            }
        });
    }, [filteredTokens, accountHistories, fetchAccountHistory]);

    const allFoundOldest = filteredTokens.every(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.data?.foundOldest === true;
    });

    const allFetchedSome = filteredTokens.every(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.data !== undefined;
    });

    // Find the oldest slot which we know we have the full history for
    let oldestSlot: number | undefined = allFoundOldest ? 0 : undefined;

    if (!allFoundOldest && allFetchedSome) {
        filteredTokens.forEach(token => {
            const history = accountHistories[token.pubkey.toBase58()];
            if (history?.data?.foundOldest === false) {
                const earliest = history.data.fetched[history.data.fetched.length - 1].slot;
                if (!oldestSlot) oldestSlot = earliest;
                oldestSlot = Math.max(oldestSlot, earliest);
            }
        });
    }

    const fetching = filteredTokens.some(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.status === FetchStatus.Fetching;
    });

    const failed = filteredTokens.some(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.status === FetchStatus.FetchFailed;
    });

    const sigSet = new Set();
    const mintAndTxs = filteredTokens
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
        })
        .sort((a, b) => b.tx.slot - a.tx.slot);

    // Status has no RPC-side filter on this path, so it filters what is fetched — and the auto-fill below keeps
    // fetching older pages until enough rows match, so it still reaches past the newest page.
    const rows =
        status === null ? mintAndTxs : mintAndTxs.filter(({ tx }) => (tx.err ? 'failed' : 'succeeded') === status);

    // Short of the target with history left to fetch: pull the next page of every unfinished account, within
    // the round budget. Waits out any in-flight or failed page first so it never stacks requests.
    const needsMore = rows.length < paging.target && !allFoundOldest;
    const canAutoFill = needsMore && allFetchedSome && !fetching && !failed && paging.rounds < AUTO_FILL_ROUNDS;
    React.useEffect(() => {
        if (!canAutoFill) return;
        setPaging(current => ({ ...current, rounds: current.rounds + 1 }));
        fetchHistories();
    }, [canAutoFill, fetchHistories]);

    // "Load More" raises the target and refills the round budget; rows already fetched show at once, and
    // the auto-fill fetches whatever is still missing.
    const loadMore = () => setPaging(current => ({ ...current, rounds: 0, target: current.target + PAGE_SIZE }));

    // Every state renders under the same header, so the filters stay reachable (and clearable) even when
    // a filter leaves nothing to show.
    const section = (children: React.ReactNode, recordCount?: number) => (
        <TokenHistorySection
            tokens={tokens}
            mints={mints}
            status={status}
            recordCount={recordCount}
            fetching={fetching}
            onRefresh={() => fetchHistories(true)}
        >
            {children}
        </TokenHistorySection>
    );

    // Footer is identical across layouts: "Load More" while there are rows or history left, otherwise the
    // left-aligned "Fetched full history" end-of-stream note. 12px padding all round (see !p-3). `frameless`
    // (the compact variant's mobile cards) drops the divider and side padding below md, like Transaction
    // History's footer; `!` because dashkit's `px-dk-4` is a custom token tailwind-merge doesn't recognise.
    const footerFor = (frameless = false) => (
        <CardFooter ui="dashkit" className={frameless ? '!border-t-0 !px-0 !py-3 md:!border-t md:!px-3' : '!p-3'}>
            {rows.length > paging.target || !allFoundOldest ? (
                <Button ui="dashkit" variant="primary" className="w-full" onClick={loadMore} disabled={fetching}>
                    {fetching ? (
                        <>
                            <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                            Loading
                        </>
                    ) : (
                        'Load More'
                    )}
                </Button>
            ) : (
                <div className="text-left text-dk-gray-700">Fetched full history</div>
            )}
        </CardFooter>
    );
    const footer = footerFor();

    if (rows.length === 0) {
        // Failure first: a failed first page leaves the account without data, which would otherwise read as
        // "still loading" forever.
        if (failed && !fetching) {
            return section(<ErrorCard retry={() => fetchHistories(true)} text="Failed to fetch transaction history" />);
        } else if (!allFetchedSome || canAutoFill || fetching) {
            // Keep the "Token History" heading visible while the first page loads instead of
            // collapsing to a bare LoadingCard.
            return section(<LoadingCard message="Loading history" />);
        } else if (mintAndTxs.length === 0 && mints.length === 0 && allFoundOldest) {
            return section(
                <ErrorCard
                    retry={() => fetchHistories(true)}
                    retryText="Try again"
                    text="No transaction history found"
                />,
            );
        }
        // A filter matched nothing in what is fetched. The footer stays while history is left: older pages
        // may still match.
        return section(
            <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                <div className={cn(ROW_PADDING, 'text-sm text-white')}>No transactions found with this filter</div>
                {footer}
            </Card>,
            0,
        );
    }

    const visibleRows = rows.slice(0, paging.target);

    return section(
        variant === 'tx-history' ? (
            // Design variant: the rows rendered as the Transaction History CSS-grid from PR #109 —
            // Token / Transaction Signature (status badge + programs stacked under it) / Time (UTC + age)
            // / Block / Size (bytes). Same tight grid surface as the Token Holdings / Token History grid.
            <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                <TokenTxHistoryGrid rows={visibleRows} />
                {footer}
            </Card>
        ) : variant === 'tx-history-compact' ? (
            // No surface below md: the rows render as their own cards there (as in Transaction History), and
            // the table frame comes back from md up.
            <Card
                variant="tight"
                className="rounded-lg border-0 bg-transparent md:border md:border-solid md:border-outer-space-800 md:bg-outer-space-900"
            >
                <TokenTxHistoryGridCompact rows={visibleRows} />
                {footerFor(true)}
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
                            <BaseTable.HeaderCell className="text-dk-gray-700">Instruction Type</BaseTable.HeaderCell>
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
        ),
        rows.length,
    );
}

type TokenFilterOption = { mint: string; name: string };

type TokenHistorySectionProps = {
    tokens: TokenInfoWithPubkey[];
    // Mints in the token filter, in the order they were added; empty means all tokens.
    mints: string[];
    status: HistoryStatus | null;
    // Records currently loaded and matching the filters; omitted while there is nothing to count yet.
    recordCount?: number;
    fetching: boolean;
    onRefresh: () => void;
    children: React.ReactNode;
};

// The Token History header, laid out like the block page's "Block Transactions" header: the title with a
// muted record count, removable chips for the active filters below it (one per filtered token), and a
// "Filters" dropdown (search, Status, Token) next to the refresh button.
export function TokenHistorySection({
    tokens,
    mints,
    status,
    recordCount,
    fetching,
    onRefresh,
    children,
}: TokenHistorySectionProps) {
    const options = useTokenFilterOptions(tokens);
    const isFilterSet = mints.length > 0 || status !== null;
    const { cluster } = useCluster();
    const labelFor = (mint: string) =>
        options.find(option => option.mint === mint)?.name ?? formatTokenName(mint, cluster);

    return (
        <CollapsibleSection
            className=""
            title={
                <>
                    <span className="mr-2">Token History</span>
                    {recordCount !== undefined && (
                        // `inline-block` keeps the count atomic: it wraps to the next line whole rather than
                        // breaking mid-phrase when it can't sit beside the title.
                        <span className="inline-block text-sm font-normal text-outer-space-300">
                            {recordCount} {isFilterSet ? 'filtered records' : 'records'}
                        </span>
                    )}
                </>
            }
            titleClassName="items-end gap-4"
            belowTitle={
                isFilterSet ? (
                    <div className="-mt-1 mb-0.5 flex flex-wrap items-center gap-2">
                        {mints.map(mint => (
                            <FilterChip
                                key={mint}
                                field="Token"
                                label={labelFor(mint)}
                                applyReset={params => toggleTokenHistoryFilter(params, mint)}
                            />
                        ))}
                        {status !== null && (
                            <FilterChip
                                field="Status"
                                label={STATUS_LABELS[status]}
                                applyReset={params => params.delete(STATUS_PARAM)}
                            />
                        )}
                    </div>
                ) : undefined
            }
            actions={
                <>
                    <RefreshButton analyticsSection="token_history_card" onClick={onRefresh} fetching={fetching} />
                    <FilterDropdown
                        options={options}
                        selectedMints={mints}
                        currentStatus={status}
                        isFilterSet={isFilterSet}
                    />
                </>
            }
        >
            {children}
        </CollapsibleSection>
    );
}

// One option per distinct mint, labelled from a single bulk lookup. Mints keep the token-account order,
// the same list (and so the same cached lookup) the Token Holdings card resolves.
function useTokenFilterOptions(tokens: TokenInfoWithPubkey[]): TokenFilterOption[] {
    const { cluster, genesisHash } = useCluster();
    const mints = useMemo(() => [...new Set(tokens.map(token => token.info.mint.toBase58()))], [tokens]);
    const { tokenInfos } = useTokenInfos(mints, cluster, genesisHash);
    return useMemo(
        () => mints.map(mint => ({ mint, name: formatTokenName(mint, cluster, tokenInfos.get(mint)) })),
        [mints, cluster, tokenInfos],
    );
}

// The block transactions "Filters" dropdown (see BlockHistoryCard), with the Program section swapped for
// a Token one and no Transaction Version section: signature-only history rows carry no version. Status is
// single-choice like the block's; Token is multi-choice — each option adds or removes its mint.
export function FilterDropdown({
    options,
    selectedMints,
    currentStatus,
    isFilterSet,
}: {
    options: TokenFilterOption[];
    selectedMints: string[];
    currentStatus: HistoryStatus | null;
    isFilterSet: boolean;
}) {
    const [query, setQuery] = React.useState('');
    const trimmed = query.trim().toLowerCase();
    // Matches the label or the raw mint address, so an unlabelled mint is still findable.
    const visibleOptions = useMemo(
        () =>
            trimmed === ''
                ? options
                : options.filter(
                      ({ mint, name }) => name.toLowerCase().includes(trimmed) || mint.toLowerCase().includes(trimmed),
                  ),
        [options, trimmed],
    );

    return (
        <Dropdown className="mr-1.5">
            <DropdownToggle asChild>
                {/* Icon-only below md; the label appears from md up. The dot marks an active filter. */}
                <Button ui="dashkit" variant="white" size="sm" type="button" className="relative" aria-label="Filters">
                    <Filter size={13} className="relative top-0.5 inline align-text-top md:mr-1.5" />
                    <span className="hidden md:inline">Filters</span>
                    {isFilterSet && (
                        <span
                            aria-hidden
                            className="absolute -right-[3px] -top-[3px] h-2.5 w-2.5 rounded-full border border-solid border-accent-700 bg-accent"
                        />
                    )}
                </Button>
            </DropdownToggle>
            <DropdownMenu align="end" className="mt-0.5 w-[280px] !border-white/20">
                <div className="border-b border-solid border-white/10 pb-1.5">
                    <div className="px-6 pb-1 text-xs uppercase text-outer-space-300">Status</div>
                    <ParamFilterLink
                        active={currentStatus === null}
                        label="Any status"
                        update={params => params.delete(STATUS_PARAM)}
                    />
                    {STATUS_VALUES.map(value => (
                        <ParamFilterLink
                            active={currentStatus === value}
                            key={value}
                            label={STATUS_LABELS[value]}
                            update={params => params.set(STATUS_PARAM, value)}
                        />
                    ))}
                </div>
                <div className="px-6 pb-1 pt-2 text-xs uppercase text-outer-space-300">Token</div>
                {/* The search narrows the Token list only, so it sits under that section's heading, above its
                    options. `px-2.5` keeps the field 10px from the menu's side edges. */}
                <div className="px-2.5 pb-1.5 pt-1">
                    <div className="relative">
                        <Search
                            size={13}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-outer-space-300"
                        />
                        <Input
                            variant="dark"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Token"
                            className="!h-auto pl-8"
                        />
                    </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                    {trimmed === '' && (
                        <ParamFilterLink
                            active={selectedMints.length === 0}
                            label="All Tokens"
                            update={params => params.delete(TOKEN_HISTORY_FILTER_PARAM)}
                        />
                    )}
                    {visibleOptions.length === 0 ? (
                        <div className="px-6 py-1.5 text-dk-base text-dark-muted-foreground">No matches</div>
                    ) : (
                        visibleOptions.map(({ mint, name }) => (
                            <ParamFilterLink
                                active={selectedMints.includes(mint)}
                                // Fixed-width menu: long token names wrap instead of widening it.
                                className="!whitespace-normal break-words"
                                key={mint}
                                label={name}
                                update={params => toggleTokenHistoryFilter(params, mint)}
                            />
                        ))
                    )}
                </div>
            </DropdownMenu>
        </Dropdown>
    );
}

// Removable pill for one active filter, as on the block page.
function FilterChip({
    field,
    label,
    applyReset,
}: {
    field: string;
    label: string;
    applyReset: (params: URLSearchParams) => void;
}) {
    const resetHref = useUpdatedHref(applyReset);

    return (
        <div className="inline-flex max-w-full items-center rounded-full border border-solid border-outer-space-800 bg-outer-space-900 py-0.5 pl-2.5 pr-0.5 text-sm text-white">
            <span className="mr-1.5 shrink-0 text-outer-space-300">{field}</span>
            <span className="min-w-0 truncate">{label}</span>
            <Link
                href={resetHref}
                // Filter links only rewrite the query: without this, Next scrolls the page back to the top of
                // the tab (the Token Holdings card) on every change.
                scroll={false}
                // The label is part of the name: several Token chips can sit side by side.
                aria-label={`Clear ${field.toLowerCase()} filter: ${label}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-outer-space-300 hover:bg-white/10 hover:text-white"
            >
                <X size={13} />
            </Link>
        </div>
    );
}

// A dropdown row linking to the current URL with `update` applied to its query (the rest is preserved).
function ParamFilterLink({
    active,
    label,
    update,
    className,
}: {
    active: boolean;
    label: string;
    update: (params: URLSearchParams) => void;
    className?: string;
}) {
    const href = useUpdatedHref(update);

    return (
        <DropdownItem asChild className={cn(className, active && 'active')}>
            <Link href={href} className="relative" scroll={false}>
                {active && (
                    <span
                        aria-hidden
                        className="absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-current"
                    />
                )}
                {label}
            </Link>
        </DropdownItem>
    );
}

// The current URL with `update` applied to a copy of its query, so other params survive.
function useUpdatedHref(update: (params: URLSearchParams) => void): string {
    const currentSearchParams = useSearchParams();
    const currentPathname = usePathname();
    return useMemo(() => {
        const params = new URLSearchParams(currentSearchParams?.toString());
        update(params);
        const nextQueryString = params.toString();
        return `${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
    }, [currentPathname, currentSearchParams, update]);
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
// `plain` renders the mint as bare text — no link, copy glyph or nickname editor — for rows whose whole
// surface is one tap target. It keeps the link colour, so the value reads the same as the linked version.
function TokenCell({ mint, plain = false }: { mint: PublicKey; plain?: boolean }) {
    const { cluster, genesisHash } = useCluster();
    const tokenInfo = useTokenInfo(true, mint.toBase58(), cluster, genesisHash);

    return (
        // Top-aligned so a nicknamed mint (two lines) keeps its logo beside the first line. The logo's negative
        // margins shrink its slot to the text-line height and 8px narrower (4px further left, 4px closer to
        // the address) without changing its size — the same slot as the Token Holdings logos.
        <div className="flex min-w-0 flex-1 items-start gap-2">
            <ProxiedImage
                alt="Token icon"
                className="-mx-1 -my-0.5 h-6 w-6 shrink-0 rounded-full border-4 border-solid border-dk-gray-700-dark"
                height={16}
                uri={tokenInfo?.logoURI ?? undefined}
                width={16}
            />
            <div className="min-w-0 flex-1">
                <Address
                    pubkey={mint}
                    link={!plain}
                    noCopy={plain}
                    noNicknameEditing={plain}
                    className={plain ? LINK_COLOR : undefined}
                    tokenLabelInfo={tokenInfo}
                />
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
// The app's link colour (dashkit `$link-color`, the global `a` rule), for values shown as plain text inside a
// tap target but meant to read as the links they are elsewhere — the transaction AccountsCard's mobile rows do
// the same.
const LINK_COLOR = 'text-[#33a382]';

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

    return (
        <div ref={ref} className="mt-1">
            <ProgramsList instructions={instructions} expanded={expanded} onToggle={() => setExpanded(e => !e)} />
        </div>
    );
}

// The first INLINE_PROGRAMS_LIMIT "program: instruction" lines plus a "+N more" tail. With `onToggle` the
// tail is a toggle that expands the list in place; without it the tail is plain text (the mobile cards,
// where a tap opens the drawer listing every instruction).
function ProgramsList({
    instructions,
    expanded = false,
    onToggle,
}: {
    instructions: InstructionSummary[];
    expanded?: boolean;
    onToggle?: () => void;
}) {
    const visible = expanded ? instructions : instructions.slice(0, INLINE_PROGRAMS_LIMIT);
    const overflow = instructions.length - INLINE_PROGRAMS_LIMIT;
    const tailClassName = 'mt-0.5 self-start text-xs text-muted';

    return (
        <div className="flex flex-col">
            {visible.map((instruction, i) => (
                <span key={i} className="text-sm">
                    <span className="text-muted">{instruction.programName}: </span>
                    <span className="text-white">{instruction.name}</span>
                </span>
            ))}
            {overflow > 0 && !onToggle && <span className={tailClassName}>{`+${overflow} more`}</span>}
            {overflow > 0 && onToggle && (
                // A span (not a <button>): the app has no Tailwind Preflight, so a bare <button> keeps its
                // native chrome and the utility classes read as "not applied". role/tabIndex restore the
                // button semantics, matching the InstructionList / InstructionTypeContent idiom.
                <span
                    role="button"
                    tabIndex={0}
                    onClick={onToggle}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onToggle();
                        }
                    }}
                    className={cn(tailClassName, 'cursor-pointer hover:text-white')}
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
    // One breakpoint subscription for the list; each card reads `isMd` to close its drawer on the way to desktop.
    const { isMd } = useBreakpoint();

    return (
        <>
            {/* Mobile (< md): one card per transaction, opening the details drawer — as in Transaction History. */}
            <div className="md:hidden">
                {rows.map(({ mint, tx }) => (
                    <MobileTxCompactCard key={tx.signature} mint={mint} tx={tx} isMd={isMd} />
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

// A mobile transaction card built like Transaction History's: its own card (`DataListRow` chrome) and a tap
// anywhere opening `TransactionDetailsDrawer`. The fields keep the labels-left rows this variant had before. Nothing inside is a link or a
// button (no copy glyphs, no nickname editor), so every tap lands on the card; the drawer carries the
// copy and open actions.
function MobileTxCompactCard({ mint, tx, isMd }: { mint: PublicKey; tx: ConfirmedSignatureInfo; isMd: boolean }) {
    const { isVisible, ref } = useVisibility<HTMLDivElement>(true);
    const instructions = useResolvedInstructionSummaries(tx.signature, isVisible);
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    // Mount the drawer on first tap only — otherwise every card would mount a closed drawer (with its own
    // raw-tx subscription) up front.
    const [drawerMounted, setDrawerMounted] = React.useState(false);
    const badge = STATUS_BADGE[tx.err ? 'failed' : 'success'];

    // The cards only exist below md: close the drawer if the viewport grows past it while open.
    React.useEffect(() => {
        if (isMd) setDrawerOpen(false);
    }, [isMd]);

    const openDrawer = () => {
        setDrawerMounted(true);
        setDrawerOpen(true);
    };

    const programs =
        instructions === undefined ? (
            <InstructionListSkeleton />
        ) : instructions.length > 0 ? (
            <ProgramsList instructions={instructions} />
        ) : (
            <span className="text-outer-space-300">---</span>
        );

    return (
        <>
            <DataListRow ref={ref} onClick={openDrawer} className="cursor-pointer">
                <div className="flex flex-col gap-1 px-3 py-3 text-sm text-white">
                    <CardField label="Signature">
                        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                            <div className="min-w-0">
                                {/* Not a link (the card is the tap target), but keeps the link colour it had. */}
                                <Signature signature={tx.signature} noCopy className={LINK_COLOR} />
                            </div>
                            <Badge ui="dashkit" tone="soft" variant={badge.variant} className="shrink-0">
                                {badge.label}
                            </Badge>
                        </div>
                    </CardField>
                    <CardField label="Time / Block">
                        <div className="flex min-w-0 flex-col gap-0.5">
                            {tx.blockTime && <span>{displayTimestampUtc(unixTimestampToMs(tx.blockTime), true)}</span>}
                            {/* Not a link (the drawer carries the block link), but in the link colour like the
                                signature and token. */}
                            <span className={LINK_COLOR}>
                                <Slot slot={tx.slot} />
                            </span>
                        </div>
                    </CardField>
                    <CardField label="Token">
                        <TokenCell mint={mint} plain />
                    </CardField>
                    {/* Programs last (they carry the most vertical content). */}
                    <CardField label="Programs">{programs}</CardField>
                </div>
            </DataListRow>

            {drawerMounted && (
                <TransactionDetailsDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    signature={tx.signature}
                    slot={tx.slot}
                    blockTime={tx.blockTime}
                    statusLabel={badge.label}
                    statusVariant={badge.variant}
                    instructionNames={instructions}
                />
            )}
        </>
    );
}

// One labels-left field of a mobile transaction card: a fixed `w-24` label column — the Token Holdings
// mobile rows' width, so the values of both cards start on one line; still wide enough for "Time / Block"
// unwrapped — and a value that can shrink. Top-aligned rather than baseline-aligned: a value led by the
// token logo would otherwise put the row's baseline under the logo and drop the label.
function CardField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <span className="w-24 shrink-0 text-outer-space-300">{label}</span>
            <div className="min-w-0 flex-1">{children}</div>
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

            const trusted = trustedInnerInstructions(transactionWithMeta.meta?.innerInstructions, {
                cluster,
                slot: transactionWithMeta.slot,
            });
            if (trusted) {
                trusted.forEach(innerIx => {
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
