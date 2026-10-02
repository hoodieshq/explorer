'use client';
import ScaledUiAmountMultiplierTooltip from '@components/account/token-extensions/ScaledUiAmountMultiplierTooltip';
import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Signature } from '@components/common/Signature';
import { Slot } from '@components/common/Slot';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cn } from '@components/shared/utils';
import { deriveScaledUiAmountMultiplier, orderMintsByVerification, type TokenInfo } from '@entities/token-info';
import { useTokenInfos } from '@entities/token-info/client';
import { useAccountHistory } from '@features/transaction-history/model/use-account-history';
import { useFetchAccountHistory } from '@features/transaction-history/model/use-fetch-account-history';
import { TokenInfoWithPubkey, useAccountOwnedTokens, useFetchAccountOwnedTokens } from '@providers/accounts/tokens';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { ToggleChip } from '@shared/ui/toggle-chip';
import { address } from '@solana/kit';
import { PublicKey } from '@solana/web3.js';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';
import { useClusterPath } from '@utils/url';
import { BigNumber } from 'bignumber.js';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { readTokenHistoryFilter, toggleTokenHistoryFilter } from '@/app/components/account/TokenHistoryCard';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { ProxiedImage } from '@/app/features/metadata';
import { Card, CardFooter } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

type Display = 'summary' | 'detail' | null;

export type OwnedTokensLayout = 'table' | 'grid';

// Holdings paginate independently of Token History (which pages 20 rows at a time in TokenHistoryCard).
// A single local declaration next to the only consumer - no shared feature module exists for holdings.
const HOLDINGS_INITIAL_VISIBLE_COUNT = 20;
const HOLDINGS_LOAD_MORE_COUNT = 20;

const useQueryDisplay = (): Display => {
    const searchParams = useSearchParams();
    const filter = searchParams?.get('display');
    if (filter === 'summary' || filter === 'detail') {
        return filter;
    } else {
        return null;
    }
};

type OwnedTokensCardProps = {
    address: string;
    layout?: OwnedTokensLayout;
    expandable?: boolean;
    // Grid layout only: each desktop row gets a toggle that filters the Token History card below to its mint;
    // the mobile rows leave it out. Off by default, since the toggle is meaningless where no Token History is
    // rendered.
    filterable?: boolean;
    // Grid layout only: the breakpoint where the labels-left mobile rows give way to the desktop table. `sm` by
    // default; `md` lines the holdings up with a Token History that switches at `md` (tokens-tab variant 2.2).
    desktopFrom?: GridBreakpoint;
    // Called on three quick clicks/taps on the "Token Holdings" heading — the tokens tab's hidden toggle for its
    // design-variant switcher.
    onTitleTripleClick?: () => void;
};

/** `HoldingsCard` stays split out because its hooks may not sit behind the guards below. */
export function OwnedTokensCard({
    address,
    layout = 'table',
    expandable = false,
    filterable = false,
    desktopFrom = 'sm',
    onTitleTripleClick,
}: OwnedTokensCardProps) {
    const pubkey = useMemo(() => new PublicKey(address), [address]);
    const ownedTokens = useAccountOwnedTokens(address);
    const fetchAccountTokens = useFetchAccountOwnedTokens();
    const refresh = () => fetchAccountTokens(pubkey);
    const display = useQueryDisplay();

    // Fetch owned tokens
    useEffect(() => {
        if (!ownedTokens) refresh();
    }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

    if (ownedTokens === undefined) {
        return null;
    }

    const { status } = ownedTokens;
    const tokens = ownedTokens.data?.tokens;
    const fetching = status === FetchStatus.Fetching;
    if (fetching && (tokens === undefined || tokens.length === 0)) {
        return <LoadingCard message="Loading token holdings" />;
    } else if (tokens === undefined) {
        return <ErrorCard retry={refresh} text="Failed to fetch token holdings" />;
    }

    if (tokens.length === 0) {
        return <ErrorCard retry={refresh} retryText="Try Again" text={'No token holdings found'} />;
    }

    return (
        <HoldingsCard
            desktopFrom={desktopFrom}
            display={display}
            expandable={expandable}
            filterable={filterable}
            layout={layout}
            onTitleTripleClick={onTitleTripleClick}
            tokens={tokens}
        />
    );
}

type HoldingsCardProps = {
    desktopFrom: GridBreakpoint;
    onTitleTripleClick?: () => void;
    display: Display;
    expandable: boolean;
    filterable: boolean;
    layout: OwnedTokensLayout;
    tokens: TokenInfoWithPubkey[];
};

// The card is a collapsible section: the "Token Holdings" heading is lifted out above the surface with a
// chevron toggle + height animation (shared `CollapsibleSection`, `className=""` so the surface comes from
// the `<Card>` below). The Summary/Detailed dropdown rides along as the section's `actions`.
//
// `layout` picks how the holdings are rendered inside the card:
// - `table` (default) — the shared `<BaseTable>` (a real `<table>`), keeping the original dashkit surface.
// - `grid` — a CSS-grid list built from `div`s, mirroring the transaction page's Accounts/Token Balances
//   tables. Desktop visuals match `table`; the internals differ so the two can diverge on mobile later.
// `expandable` (grid layout only) turns each holding into a spoiler: a chevron opens the row to reveal that
// token account's recent transactions plus a link to its account page. A design variant for the tokens tab.
function HoldingsCard({
    desktopFrom,
    display,
    expandable,
    filterable,
    layout,
    onTitleTripleClick,
    tokens,
}: HoldingsCardProps) {
    const { cluster, genesisHash } = useCluster();
    const onTitleClick = useTripleClick(onTitleTripleClick);
    const [visibleCount, setVisibleCount] = useState(HOLDINGS_INITIAL_VISIBLE_COUNT);

    const holdings = useMemo(() => aggregateByMint(tokens), [tokens]);
    const mints = useMemo(() => Array.from(holdings.keys()), [holdings]);

    // Every mint, not just the visible ones: ordering needs each mint's verified status.
    const { isLoading, tokenInfos } = useTokenInfos(mints, cluster, genesisHash);

    // A permutation of `mints`, so its length is the distinct mint count the footer reports.
    const orderedMints = useMemo(() => orderMintsByVerification(mints, tokenInfos), [mints, tokenInfos]);

    // Hold the spinner rather than paint an arbitrary order that reshuffles a moment later.
    if (isLoading) {
        return <LoadingCard message="Loading token holdings" />;
    }

    const visibleHoldings = orderedMints.slice(0, visibleCount).flatMap(mintAddress => {
        const token = holdings.get(mintAddress);
        return token ? [{ mintAddress, token, tokenInfo: tokenInfos.get(mintAddress) }] : [];
    });
    const footer = (
        <TokensCardFooter
            loadMore={() => setVisibleCount(count => count + HOLDINGS_LOAD_MORE_COUNT)}
            totalCount={orderedMints.length}
            visibleCount={visibleCount}
        />
    );

    return (
        <CollapsibleSection
            title={
                onTitleTripleClick ? (
                    // `select-none`: a triple click would otherwise select the heading text.
                    <span className="select-none" onClick={onTitleClick}>
                        Token Holdings
                    </span>
                ) : (
                    'Token Holdings'
                )
            }
            className=""
            // Summary/Detailed only applies to the legacy table; the grid is always the detailed view, so it
            // needs no toggle.
            actions={layout === 'grid' ? undefined : <DisplayDropdown display={display} />}
        >
            {layout === 'grid' ? (
                // Surface matched to the transaction Tokens/Accounts card, in pure Tailwind: bg
                // `outer-space-900` equals `#1e2423` (dashkit `dk-gray-800-dark`); `border-outer-space-800`
                // gives the card the same tone as the row separators; `rounded-lg` is the 8px radius.
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    {expandable ? (
                        <ExpandableTokensGrid holdings={visibleHoldings} />
                    ) : (
                        <TokensGrid desktopFrom={desktopFrom} filterable={filterable} holdings={visibleHoldings} />
                    )}
                    {footer}
                </Card>
            ) : (
                <Card ui="dashkit" marginBottom="none">
                    <BaseTable ui="dashkit" variant="card" nowrap>
                        <BaseTable.Head>
                            <BaseTable.Row>
                                <BaseTable.HeaderCell className="w-px p-0 text-center text-dk-gray-700">
                                    Logo
                                </BaseTable.HeaderCell>
                                {display === 'detail' && (
                                    <BaseTable.HeaderCell className="text-dk-gray-700">
                                        Account Address
                                    </BaseTable.HeaderCell>
                                )}
                                <BaseTable.HeaderCell className="text-dk-gray-700">Mint Address</BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="text-dk-gray-700">
                                    {display === 'detail' ? 'Total Balance' : 'Balance'}
                                </BaseTable.HeaderCell>
                            </BaseTable.Row>
                        </BaseTable.Head>
                        <BaseTable.Body>
                            {visibleHoldings.map(holding => (
                                <TokenRow
                                    key={holding.mintAddress}
                                    {...holding}
                                    showAccountAddress={display === 'detail'}
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

type MappedToken = {
    amount: string;
    decimals: number;
    pubkey: string;
    rawAmount: string;
    scaledUiAmountMultiplier: string;
};

// One visible row: a mint's aggregated balance plus its resolved metadata from the card's bulk lookup.
type Holding = {
    mintAddress: string;
    token: MappedToken;
    tokenInfo: TokenInfo | undefined;
};

/** Insertion order is RPC order, which the verification tiering preserves within a tier. */
function aggregateByMint(tokens: TokenInfoWithPubkey[]): Map<string, MappedToken> {
    const byMint = new Map<string, MappedToken>();

    for (const { info: token, pubkey } of tokens) {
        const mintAddress = token.mint.toBase58();
        const existing = byMint.get(mintAddress);
        const decimals = token.tokenAmount.decimals;

        let amount = token.tokenAmount.uiAmountString;
        // Accumulated alongside `amount` so the tooltip's pre-scaling value matches the total the row renders.
        let rawAmount = token.tokenAmount.amount;
        if (existing) {
            amount = new BigNumber(existing.amount).plus(token.tokenAmount.uiAmountString).toString();
            rawAmount = new BigNumber(existing.rawAmount).plus(token.tokenAmount.amount).toString();
        }

        byMint.set(mintAddress, {
            amount,
            decimals,
            pubkey: pubkey.toBase58(),
            rawAmount,
            // Multiplier is a per-mint ratio, so one account's raw/ui pair is enough to derive it.
            scaledUiAmountMultiplier: deriveScaledUiAmountMultiplier(
                token.tokenAmount.amount,
                decimals,
                token.tokenAmount.uiAmountString,
            ),
        });
    }

    return byMint;
}

function TokenRow({ mintAddress, showAccountAddress, token, tokenInfo }: Holding & { showAccountAddress: boolean }) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell className="w-px p-0 text-center">
                <ProxiedImage
                    alt="Token icon"
                    className="h-6 w-6 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
            </BaseTable.Cell>
            {showAccountAddress && (
                <BaseTable.Cell>
                    <Address pubkey={new PublicKey(token.pubkey)} link />
                </BaseTable.Cell>
            )}
            <BaseTable.Cell>
                <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
            </BaseTable.Cell>
            <BaseTable.Cell>
                {token.amount} {tokenInfo?.symbol ?? 'tokens'}
                <ScaledUiAmountMultiplierTooltip
                    rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                    scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                />
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}

// `gridCellVariants` owns all cell styling. `role` picks header vs body chrome; `column` handles the
// per-column concerns: `logo` centers the icon, `address` collapses to `min-w-0` so the mid-truncating
// `<Address>` shrinks instead of overflowing on mobile, `balance` keeps the amount + symbol on one line.
// Body cells align to the top: a nicknamed mint wraps onto two lines, and the rest of its row should stay on
// the first line rather than drift to the middle. The logo and filter chip are pulled to the text-line height
// (negative margins), so single-line rows look the same either way.
const gridCellVariants = cva('flex px-3 py-2.5', {
    defaultVariants: { column: 'none', role: 'body' },
    variants: {
        column: {
            address: 'min-w-0',
            balance: 'whitespace-nowrap',
            logo: 'justify-center',
            none: '',
        },
        role: {
            body: 'items-start border-t border-solid border-outer-space-800',
            header: 'items-center whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});

// The grid is always the detailed view — Logo / Mint Address / Account Address / Total Balance. (Summary vs
// Detailed only applies to the legacy table.) Two renderings toggled at `desktopFrom` (`sm` unless the caller
// asks for `md`): below it each holding is a labels-left block (no shared header, every field carries its own
// left label, so long base58 keys read top-to-bottom); from it up it becomes the CSS-grid table — the logo hugs its icon (`auto`), the balance
// takes a `minmax(auto,220px)` track (a touch wider than the transaction page's 180px Post Balance column,
// so long amounts + symbols breathe), and the two address columns take the remaining width as
// `minmax(0,1fr)` and mid-truncate.
function TokensGrid({
    desktopFrom,
    filterable,
    holdings,
}: {
    desktopFrom: GridBreakpoint;
    filterable: boolean;
    holdings: Holding[];
}) {
    return (
        <>
            {/* Mobile (below `desktopFrom`): labels-left list. */}
            <div className={gridMobileVariants({ desktopFrom })}>
                {holdings.map(holding => (
                    <MobileTokenRow key={holding.mintAddress} {...holding} />
                ))}
            </div>

            {/* Desktop (`desktopFrom` up): CSS-grid table. `role="table"` + `role="row"` wrappers restore the semantics
                the old `<table>` gave screen readers. The row wrappers use `contents` (`display: contents`) so
                they generate no box and their cells stay direct participants in this grid — ARIA structure
                without disturbing the CSS-grid column alignment. */}
            <div className={gridDesktopVariants({ desktopFrom })}>
                <div
                    role="table"
                    aria-label="Token holdings"
                    className={cn('grid min-w-full', filterable ? FILTERABLE_GRID_TEMPLATE : GRID_TEMPLATE)}
                >
                    <div role="row" className="contents">
                        <div role="columnheader" className={gridCellVariants({ column: 'logo', role: 'header' })}>
                            Logo
                        </div>
                        <div role="columnheader" className={gridCellVariants({ column: 'address', role: 'header' })}>
                            Mint Address
                        </div>
                        <div role="columnheader" className={gridCellVariants({ column: 'address', role: 'header' })}>
                            Account Address
                        </div>
                        <div role="columnheader" className={gridCellVariants({ column: 'balance', role: 'header' })}>
                            Total Balance
                        </div>
                        {filterable && (
                            <div role="columnheader" className={gridCellVariants({ role: 'header' })}>
                                <span className="sr-only">Filter Token History</span>
                            </div>
                        )}
                    </div>
                    {holdings.map(holding => (
                        <GridTokenRow key={holding.mintAddress} filterable={filterable} {...holding} />
                    ))}
                </div>
            </div>
        </>
    );
}

// Mobile row (< sm): one labels-left line per field (Mint / Account / Total Balance). Labels sit in a
// fixed-width column so the values line up; the value wrappers are `min-w-0` so `<Address>` mid-truncates
// instead of overflowing. The logo rides inline just before the Mint address. The Mint line aligns to the top:
// a nicknamed mint takes two lines, and the label and logo belong beside the first.
function MobileTokenRow({ mintAddress, token, tokenInfo }: Holding) {
    return (
        <div className="flex flex-col gap-1 border-t border-solid border-outer-space-800 px-3 py-3 text-sm text-white first:border-t-0">
            <div className="flex items-start gap-2">
                <span className="w-24 shrink-0 text-outer-space-300">Mint</span>
                <ProxiedImage
                    alt="Token icon"
                    // `-my-0.5` keeps the 24px logo from making this line taller than the text lines: its
                    // margin-box drops to the text line height while the icon itself renders at its full size.
                    // `-mx-1` narrows its slot the same way: the logo sits 4px further left and 4px closer to
                    // the address, at an unchanged size.
                    className="-mx-1 -my-0.5 h-6 w-6 shrink-0 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
                <div className="min-w-0 flex-1">
                    <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 text-outer-space-300">Account</span>
                <div className="min-w-0 flex-1">
                    <Address pubkey={new PublicKey(token.pubkey)} link />
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 text-outer-space-300">Total Balance</span>
                <span className="min-w-0 flex-1 break-words">
                    {token.amount} {tokenInfo?.symbol ?? 'tokens'}
                    <ScaledUiAmountMultiplierTooltip
                        rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                        scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                    />
                </span>
            </div>
        </div>
    );
}

function GridTokenRow({ filterable, mintAddress, token, tokenInfo }: Holding & { filterable: boolean }) {
    return (
        <div role="row" className="contents">
            <div role="cell" className={gridCellVariants({ column: 'logo' })}>
                <ProxiedImage
                    alt="Token icon"
                    // `-my-0.5` keeps the 24px logo from driving the row height above the text cells: its
                    // margin-box drops to the text line height while the icon itself renders at its full size.
                    className="-mx-1 -my-0.5 h-6 w-6 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
            </div>
            <div role="cell" className={gridCellVariants({ column: 'address' })}>
                <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
            </div>
            <div role="cell" className={gridCellVariants({ column: 'address' })}>
                <Address pubkey={new PublicKey(token.pubkey)} link />
            </div>
            <div role="cell" className={gridCellVariants({ column: 'balance' })}>
                {token.amount} {tokenInfo?.symbol ?? 'tokens'}
                <ScaledUiAmountMultiplierTooltip
                    rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                    scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                />
            </div>
            {filterable && (
                <div role="cell" className={cn(gridCellVariants({}), 'justify-end')}>
                    <TokenHistoryFilterToggle mintAddress={mintAddress} symbol={tokenInfo?.symbol} />
                </div>
            )}
        </div>
    );
}

type GridBreakpoint = 'sm' | 'md';

// The two halves of TokensGrid's mobile/desktop switch, one static class set per breakpoint so Tailwind can
// see them (a `${bp}:` template would be purged).
const gridMobileVariants = cva('', {
    defaultVariants: { desktopFrom: 'sm' },
    variants: { desktopFrom: { md: 'md:hidden', sm: 'sm:hidden' } },
});
const gridDesktopVariants = cva('hidden w-full overflow-x-auto text-sm text-white', {
    defaultVariants: { desktopFrom: 'sm' },
    variants: { desktopFrom: { md: 'md:block', sm: 'sm:block' } },
});

// Grid tracks for the holdings table; the filterable variant adds a trailing `auto` column for the toggle.
const GRID_TEMPLATE = 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(auto,220px)]';
const FILTERABLE_GRID_TEMPLATE = 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(auto,220px)_auto]';

// Desktop-row toggle (the mobile rows go without) that adds this mint to the Token History filter, or takes it
// out when it is already in; several rows can be in the filter at once. A `ToggleChip`, so on/off look exactly like the Logs section's Parsed /
// RAW switch. `scroll: false` keeps the page where it is — the history updates in place.
function TokenHistoryFilterToggle({ mintAddress, symbol }: { mintAddress: string; symbol?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const active = readTokenHistoryFilter(searchParams).includes(mintAddress);
    const tokenName = symbol ?? 'this token';
    const label = active ? `Remove ${tokenName} from Token History filter` : `Add ${tokenName} to Token History filter`;

    const toggle = () => {
        const params = new URLSearchParams(searchParams?.toString());
        toggleTokenHistoryFilter(params, mintAddress);
        const query = params.toString();
        router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
    };

    return (
        <ToggleChip
            active={active}
            type="button"
            onClick={toggle}
            aria-label={label}
            title={label}
            // `-my-1` shrinks the 28px chip's margin box to the 20px text line (the logo's `-my-0.5` trick), so it
            // sits in the row's normal `py-2.5` without making the row taller than the text rows. Overriding the
            // cell padding instead doesn't work: `cn` is plain clsx, so `py-2.5` and an override both ship and
            // `py-2.5` wins on CSS order.
            className="-my-1 shrink-0"
        >
            <FilterPlusIcon />
        </ToggleChip>
    );
}

// react-feather ships only a plain `Filter`, so this is its funnel narrowed to the left with a plus in the
// free lower-right corner. Sized by the Button's `[&_svg]:size-3`, like any icon inside it.
function FilterPlusIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="18 3 2 3 8.4 10.5 8.4 17 11.6 19 11.6 10.5 18 3" />
            <line x1="19" y1="14" x2="19" y2="22" />
            <line x1="15" y1="18" x2="23" y2="18" />
        </svg>
    );
}

// How many recent transactions the spoiler preview shows before the "View all" link.
const RECENT_TX_LIMIT = 8;
// Same tracks as the normal grid plus a trailing `auto` column for the expand chevron.
const EXPANDABLE_GRID_TEMPLATE = 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(auto,220px)_auto]';

// Variant 3: the holdings grid where each row is a spoiler. Mirrors TokensGrid's columns (Logo / Mint /
// Account / Total Balance) and adds a chevron; opening a row reveals its recent transactions.
function ExpandableTokensGrid({ holdings }: { holdings: Holding[] }) {
    return (
        <>
            {/* Mobile (< sm): expandable labels-left blocks. */}
            <div className="sm:hidden">
                {holdings.map(holding => (
                    <ExpandableMobileRow key={holding.mintAddress} {...holding} />
                ))}
            </div>

            {/* Desktop (sm+): CSS-grid table with a trailing expand column. */}
            <div className="hidden w-full overflow-x-auto text-sm text-white sm:block">
                <div
                    role="table"
                    aria-label="Token holdings"
                    className={cn('grid min-w-full', EXPANDABLE_GRID_TEMPLATE)}
                >
                    <div role="row" className="contents">
                        <div role="columnheader" className={gridCellVariants({ column: 'logo', role: 'header' })}>
                            Logo
                        </div>
                        <div role="columnheader" className={gridCellVariants({ column: 'address', role: 'header' })}>
                            Mint Address
                        </div>
                        <div role="columnheader" className={gridCellVariants({ column: 'address', role: 'header' })}>
                            Account Address
                        </div>
                        <div role="columnheader" className={gridCellVariants({ column: 'balance', role: 'header' })}>
                            Total Balance
                        </div>
                        <div role="columnheader" className={gridCellVariants({ role: 'header' })} />
                    </div>
                    {holdings.map(holding => (
                        <ExpandableGridRow key={holding.mintAddress} {...holding} />
                    ))}
                </div>
            </div>
        </>
    );
}

// Spoiler toggle shared by the desktop and mobile rows: a grey "history" label plus the chevron, both
// inside one ghost button so the whole thing is the clickable target.
function SpoilerToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse recent transactions' : 'Expand recent transactions'}
            className="h-auto shrink-0 !gap-0.5 !px-1.5 !py-1 text-xs text-outer-space-300 [&_svg]:size-4"
            onClick={onToggle}
        >
            history
            <ChevronDown
                size={16}
                className={cn('transition-transform duration-200 ease-in-out', expanded ? 'rotate-180' : 'rotate-0')}
            />
        </Button>
    );
}

function ExpandableGridRow({ mintAddress, token, tokenInfo }: Holding) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div role="row" className="contents">
            <div role="cell" className={gridCellVariants({ column: 'logo' })}>
                <ProxiedImage
                    alt="Token icon"
                    className="-mx-1 -my-0.5 h-6 w-6 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
            </div>
            <div role="cell" className={gridCellVariants({ column: 'address' })}>
                <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
            </div>
            <div role="cell" className={gridCellVariants({ column: 'address' })}>
                <Address pubkey={new PublicKey(token.pubkey)} link />
            </div>
            <div role="cell" className={gridCellVariants({ column: 'balance' })}>
                {token.amount} {tokenInfo?.symbol ?? 'tokens'}
                <ScaledUiAmountMultiplierTooltip
                    rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                    scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                />
            </div>
            <div role="cell" className={cn(gridCellVariants({}), 'justify-end')}>
                <SpoilerToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
            </div>
            <div
                className={cn(
                    // Start at grid line 2 (skip the logo column) so the panel — with its own px-3 —
                    // lines up under the Mint Address column instead of the row's left edge.
                    'col-[2/-1] grid transition-[grid-template-rows,opacity] duration-200 ease-in-out',
                    expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="px-3 pb-9">
                        <RecentTokenTransactions accountAddress={token.pubkey} enabled={expanded} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExpandableMobileRow({ mintAddress, token, tokenInfo }: Holding) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="flex flex-col gap-1 border-t border-solid border-outer-space-800 px-3 py-3 text-sm text-white first:border-t-0">
            <div className="flex items-start gap-2">
                <span className="w-24 shrink-0 text-outer-space-300">Mint</span>
                <ProxiedImage
                    alt="Token icon"
                    className="-mx-1 -my-0.5 h-6 w-6 shrink-0 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
                <div className="min-w-0 flex-1">
                    <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
                </div>
                <SpoilerToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
            </div>
            <div className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 text-outer-space-300">Account</span>
                <div className="min-w-0 flex-1">
                    <Address pubkey={new PublicKey(token.pubkey)} link />
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 text-outer-space-300">Total Balance</span>
                <span className="min-w-0 flex-1 break-words">
                    {token.amount} {tokenInfo?.symbol ?? 'tokens'}
                    <ScaledUiAmountMultiplierTooltip
                        rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                        scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                    />
                </span>
            </div>
            <div
                className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-200 ease-in-out',
                    expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="mt-2">
                        <RecentTokenTransactions accountAddress={token.pubkey} enabled={expanded} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// The spoiler body: the token account's most recent transactions, fetched lazily on first expand (gated by
// `enabled`), plus a link to the full token-account page.
function RecentTokenTransactions({ accountAddress, enabled }: { accountAddress: string; enabled: boolean }) {
    const kitAddress = useMemo(() => address(accountAddress), [accountAddress]);
    const history = useAccountHistory(accountAddress);
    const fetchHistory = useFetchAccountHistory(RECENT_TX_LIMIT);
    const viewAllPath = useClusterPath({ pathname: `/address/${accountAddress}` });

    useEffect(() => {
        if (enabled && !history) {
            fetchHistory(kitAddress, false, true);
        }
    }, [enabled, accountAddress]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetched = history?.data?.fetched;
    const rows = fetched?.slice(0, RECENT_TX_LIMIT) ?? [];
    const loading = !history || (history.status === FetchStatus.Fetching && !fetched);

    return (
        <div className="flex flex-col gap-2 pt-1">
            <div className="text-xs uppercase text-outer-space-300">Recent transactions</div>
            {loading ? (
                <div className="text-sm text-outer-space-300">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-outer-space-300">No recent transactions</div>
            ) : (
                // Content-sized columns (each track is `auto`), no horizontal dividers. Fragments keep the
                // four cells as direct grid children so the columns line up across rows.
                <div className="grid w-fit grid-cols-[auto_auto_auto] items-center gap-x-6 gap-y-1.5">
                    {rows.map(tx => (
                        <React.Fragment key={tx.signature}>
                            {/* Signature + status share one column — the badge sits right after the signature. */}
                            <div className="flex items-center gap-1.5">
                                <Signature signature={tx.signature} link />
                                <Badge ui="dashkit" variant={tx.err ? 'warning' : 'success'}>
                                    {tx.err ? 'Failed' : 'Success'}
                                </Badge>
                            </div>
                            <span className="whitespace-nowrap text-outer-space-300">
                                {tx.blockTime ? displayTimestampUtc(unixTimestampToMs(tx.blockTime), true) : '—'}
                            </span>
                            <Slot slot={tx.slot} link />
                        </React.Fragment>
                    ))}
                </div>
            )}
            <div>
                <Button ui="dashkit" variant="white" size="sm" className="!text-xs" asChild>
                    <Link href={viewAllPath}>View all transactions</Link>
                </Button>
            </div>
        </div>
    );
}

function TokensCardFooter({
    loadMore,
    totalCount,
    visibleCount,
}: {
    loadMore: () => void;
    totalCount: number;
    visibleCount: number;
}) {
    if (visibleCount >= totalCount) {
        return null;
    }

    return (
        <CardFooter ui="dashkit">
            <Button ui="dashkit" variant="primary" className="w-full" onClick={loadMore}>
                Load More ({visibleCount} of {totalCount})
            </Button>
        </CardFooter>
    );
}

// Three clicks within this window count as a triple click.
const TRIPLE_CLICK_WINDOW_MS = 600;

// Returns a click handler that calls `onTriple` on every third click landing within TRIPLE_CLICK_WINDOW_MS.
// Clicks are counted by hand rather than read from `MouseEvent.detail`, which mobile browsers don't reliably
// increment for repeated taps.
function useTripleClick(onTriple?: () => void) {
    const clicks = useRef<number[]>([]);
    return useCallback(() => {
        const now = Date.now();
        clicks.current = [...clicks.current.filter(time => now - time < TRIPLE_CLICK_WINDOW_MS), now];
        if (clicks.current.length >= 3) {
            clicks.current = [];
            onTriple?.();
        }
    }, [onTriple]);
}

type DropdownProps = {
    display: Display;
};

const DisplayDropdown = ({ display }: DropdownProps) => {
    const currentSearchParams = useSearchParams();
    const currentPath = usePathname();
    const buildLocation = useCallback(
        (display: Display) => {
            const params = new URLSearchParams(currentSearchParams?.toString());
            if (display === null) {
                params.delete('display');
            } else {
                params.set('display', display);
            }
            const nextQueryString = params.toString();
            return `${currentPath}${nextQueryString ? `?${nextQueryString}` : ''}`;
        },
        [currentPath, currentSearchParams],
    );

    const DISPLAY_OPTIONS: Display[] = [null, 'detail'];
    return (
        <Dropdown>
            <DropdownToggle asChild>
                <Button ui="dashkit" variant="white" size="sm" type="button">
                    {display === 'detail' ? 'Detailed' : 'Summary'} <ChevronDown size={15} className="align-text-top" />
                </Button>
            </DropdownToggle>
            <DropdownMenu align="end">
                {DISPLAY_OPTIONS.map(displayOption => {
                    return (
                        <DropdownItem
                            asChild
                            key={displayOption || 'null'}
                            className={cn(displayOption === display && 'active')}
                        >
                            <Link href={buildLocation(displayOption)}>
                                {displayOption === 'detail' ? 'Detailed' : 'Summary'}
                            </Link>
                        </DropdownItem>
                    );
                })}
            </DropdownMenu>
        </Dropdown>
    );
};
