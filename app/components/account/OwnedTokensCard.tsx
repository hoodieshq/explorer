'use client';
import ScaledUiAmountMultiplierTooltip from '@components/account/token-extensions/ScaledUiAmountMultiplierTooltip';
import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cn } from '@components/shared/utils';
import { deriveScaledUiAmountMultiplier, useTokenInfo } from '@entities/token-info';
import { TokenInfoWithPubkey, useAccountOwnedTokens, useFetchAccountOwnedTokens } from '@providers/accounts/tokens';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { BigNumber } from 'bignumber.js';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback, useMemo } from 'react';
import { ChevronDown } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { ProxiedImage } from '@/app/features/metadata';
import { Card, CardFooter } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

type Display = 'summary' | 'detail' | null;

export type OwnedTokensLayout = 'table' | 'grid';

// Holdings paginate independently of Token History (which stays at 4/4 in @/app/features/token-history/config).
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

// The card is a collapsible section: the "Token Holdings" heading is lifted out above the surface with a
// chevron toggle + height animation (shared `CollapsibleSection`, `className=""` so the surface comes from
// the `<Card>` below). The Summary/Detailed dropdown rides along as the section's `actions`.
//
// `layout` picks how the holdings are rendered inside the card:
// - `table` (default) — the shared `<BaseTable>` (a real `<table>`), keeping the original dashkit surface.
// - `grid` — a CSS-grid list built from `div`s, mirroring the transaction page's Accounts/Token Balances
//   tables. Desktop visuals match `table`; the internals differ so the two can diverge on mobile later.
export function OwnedTokensCard({ address, layout = 'table' }: { address: string; layout?: OwnedTokensLayout }) {
    const pubkey = useMemo(() => new PublicKey(address), [address]);
    const ownedTokens = useAccountOwnedTokens(address);
    const fetchAccountTokens = useFetchAccountOwnedTokens();
    const refresh = () => fetchAccountTokens(pubkey);
    const [visibleCount, setVisibleCount] = React.useState(HOLDINGS_INITIAL_VISIBLE_COUNT);
    const display = useQueryDisplay();

    // Fetch owned tokens
    React.useEffect(() => {
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

    const loadMore = () => setVisibleCount(c => c + HOLDINGS_LOAD_MORE_COUNT);

    return (
        <CollapsibleSection title="Token Holdings" className="" actions={<DisplayDropdown display={display} />}>
            {layout === 'grid' ? (
                // Surface matched to the transaction Tokens/Accounts card, in pure Tailwind: bg
                // `outer-space-900` equals `#1e2423` (dashkit `dk-gray-800-dark`); `border-outer-space-800`
                // gives the card the same tone as the row separators; `rounded-lg` is the 8px radius.
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    <TokensGrid tokens={tokens} visibleCount={visibleCount} display={display} />
                    <TokensCardFooter tokens={tokens} visibleCount={visibleCount} loadMore={loadMore} />
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
                        {display === 'detail' ? (
                            <HoldingsDetail tokens={tokens} visibleCount={visibleCount} />
                        ) : (
                            <HoldingsSummary tokens={tokens} visibleCount={visibleCount} />
                        )}
                    </BaseTable>
                    <TokensCardFooter tokens={tokens} visibleCount={visibleCount} loadMore={loadMore} />
                </Card>
            )}
        </CollapsibleSection>
    );
}

type MappedToken = {
    amount: string;
    decimals: number;
    pubkey?: string;
    rawAmount: string;
    scaledUiAmountMultiplier: string;
};

// Collapses the raw token-account list into one row per mint, summing balances across accounts of the same
// mint. `withPubkey` keeps the (last-seen) account address for the Detailed display; Summary drops it.
// Shared by both the table bodies and the grid so the two layouts stay identical in what they show.
function useMappedTokens(tokens: TokenInfoWithPubkey[], withPubkey: boolean): [string, MappedToken][] {
    return useMemo(() => {
        const tokensMap = new Map<string, MappedToken>();

        tokens.forEach(({ info: token, pubkey }) => {
            const mintAddress = token.mint.toBase58();
            const existingToken = tokensMap.get(mintAddress);

            const decimals = token.tokenAmount.decimals;
            let amount = token.tokenAmount.uiAmountString;
            // Accumulated alongside `amount` so the tooltip's pre-scaling value matches the total the row renders.
            let rawAmount = token.tokenAmount.amount;

            if (existingToken) {
                amount = new BigNumber(existingToken.amount).plus(token.tokenAmount.uiAmountString).toString();
                rawAmount = new BigNumber(existingToken.rawAmount).plus(token.tokenAmount.amount).toString();
            }

            tokensMap.set(mintAddress, {
                amount,
                decimals,
                ...(withPubkey ? { pubkey: pubkey.toBase58() } : {}),
                rawAmount,
                // Multiplier is a per-mint ratio, so one account's raw/ui pair is enough to derive it.
                scaledUiAmountMultiplier: deriveScaledUiAmountMultiplier(
                    token.tokenAmount.amount,
                    decimals,
                    token.tokenAmount.uiAmountString,
                ),
            });
        });

        return Array.from(tokensMap.entries());
    }, [tokens, withPubkey]);
}

function HoldingsDetail({ tokens, visibleCount }: { tokens: TokenInfoWithPubkey[]; visibleCount: number }) {
    const visibleTokens = useMappedTokens(tokens, true).slice(0, visibleCount);

    return (
        <tbody>
            {visibleTokens.map(([mintAddress, token]) => (
                <TokenRow key={mintAddress} mintAddress={mintAddress} token={token} showAccountAddress={true} />
            ))}
        </tbody>
    );
}

function HoldingsSummary({ tokens, visibleCount }: { tokens: TokenInfoWithPubkey[]; visibleCount: number }) {
    // The Map build is memoized on `tokens`; only this materialize-and-slice runs per render, O(unique mints).
    // Negligible even at a few thousand mints. If a profile ever flags it, iterate the Map and break at visibleCount.
    const visibleTokens = useMappedTokens(tokens, false).slice(0, visibleCount);

    return (
        <tbody>
            {visibleTokens.map(([mintAddress, token]) => (
                <TokenRow key={mintAddress} mintAddress={mintAddress} token={token} showAccountAddress={false} />
            ))}
        </tbody>
    );
}

type TokenRowProps = {
    mintAddress: string;
    token: MappedToken;
    showAccountAddress: boolean;
};

function TokenRow({ mintAddress, token, showAccountAddress }: TokenRowProps) {
    const { cluster, genesisHash } = useCluster();
    // Each visible row fetches its mint metadata once via useTokenInfo (coalesced into the app-wide
    // batched POST) and feeds it to the mint Address as tokenLabelInfo - no second fetch.
    const tokenInfo = useTokenInfo(true, mintAddress, cluster, genesisHash);

    return (
        <tr>
            <td className="w-px p-0 text-center">
                <ProxiedImage
                    alt="Token icon"
                    className="h-6 w-6 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
            </td>
            {showAccountAddress && token.pubkey && (
                <td>
                    <Address pubkey={new PublicKey(token.pubkey)} link />
                </td>
            )}
            <td>
                <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
            </td>
            <td>
                {token.amount} {tokenInfo?.symbol}
                <ScaledUiAmountMultiplierTooltip
                    rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                    scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                />
            </td>
        </tr>
    );
}

// `gridCellVariants` owns all cell styling. `role` picks header vs body chrome; `column` handles the
// per-column concerns: `logo` centers the icon, `address` collapses to `min-w-0` so the mid-truncating
// `<Address>` shrinks instead of overflowing on mobile, `balance` keeps the amount + symbol on one line.
const gridCellVariants = cva('flex items-center px-3 py-2.5', {
    defaultVariants: { column: 'none', role: 'body' },
    variants: {
        column: {
            address: 'min-w-0',
            balance: 'whitespace-nowrap',
            logo: 'justify-center',
            none: '',
        },
        role: {
            body: 'border-t border-solid border-outer-space-800',
            header: 'whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});

// Two renderings toggled at `sm`. Below `sm` (phones) each holding is a labels-left block: no shared column
// header, every field carries its own left label, so long base58 keys read top-to-bottom instead of being
// squeezed into narrow columns. At `sm+` it becomes the CSS-grid table: the logo hugs its icon (`auto`) and
// the balance takes the same `minmax(auto,180px)` track as the transaction page's Post Balance column, while
// the address column(s) take the remaining width as `minmax(0,1fr)` and mid-truncate. Detailed display
// inserts the Account Address column before the mint.
function TokensGrid({
    tokens,
    visibleCount,
    display,
}: {
    tokens: TokenInfoWithPubkey[];
    visibleCount: number;
    display: Display;
}) {
    const showAccountAddress = display === 'detail';
    const visibleTokens = useMappedTokens(tokens, showAccountAddress).slice(0, visibleCount);

    return (
        <>
            {/* Mobile (< sm): labels-left list. */}
            <div className="sm:hidden">
                {visibleTokens.map(([mintAddress, token]) => (
                    <MobileTokenRow
                        key={mintAddress}
                        mintAddress={mintAddress}
                        token={token}
                        showAccountAddress={showAccountAddress}
                    />
                ))}
            </div>

            {/* Desktop (sm+): CSS-grid table. `role="table"` + `role="row"` wrappers restore the semantics
                the old `<table>` gave screen readers. The row wrappers use `contents` (`display: contents`) so
                they generate no box and their cells stay direct participants in this grid — ARIA structure
                without disturbing the CSS-grid column alignment. */}
            <div className="hidden w-full overflow-x-auto text-sm text-white sm:block">
                <div
                    role="table"
                    aria-label="Token holdings"
                    className={cn(
                        'grid min-w-full',
                        showAccountAddress
                            ? 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(auto,180px)]'
                            : 'grid-cols-[auto_minmax(0,1fr)_minmax(auto,180px)]',
                    )}
                >
                    <div role="row" className="contents">
                        <div role="columnheader" className={gridCellVariants({ column: 'logo', role: 'header' })}>
                            Logo
                        </div>
                        {showAccountAddress && (
                            <div
                                role="columnheader"
                                className={gridCellVariants({ column: 'address', role: 'header' })}
                            >
                                Account Address
                            </div>
                        )}
                        <div role="columnheader" className={gridCellVariants({ column: 'address', role: 'header' })}>
                            Mint Address
                        </div>
                        <div role="columnheader" className={gridCellVariants({ column: 'balance', role: 'header' })}>
                            {showAccountAddress ? 'Total Balance' : 'Balance'}
                        </div>
                    </div>
                    {visibleTokens.map(([mintAddress, token]) => (
                        <GridTokenRow
                            key={mintAddress}
                            mintAddress={mintAddress}
                            token={token}
                            showAccountAddress={showAccountAddress}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

// Mobile row (< sm): one labels-left line per field. Labels sit in a fixed-width column so the values line
// up; the value wrappers are `min-w-0` so `<Address>` mid-truncates instead of overflowing. The logo rides
// inline just before the Mint address. Detailed display adds the Account line and relabels Balance →
// Total Balance.
function MobileTokenRow({ mintAddress, token, showAccountAddress }: TokenRowProps) {
    const { cluster, genesisHash } = useCluster();
    // Same lazy per-row enrichment as the desktop rows: one batched useTokenInfo fetch per mint.
    const tokenInfo = useTokenInfo(true, mintAddress, cluster, genesisHash);

    return (
        <div className="flex flex-col gap-1 border-t border-solid border-outer-space-800 px-3 py-3 text-sm text-white first:border-t-0">
            {showAccountAddress && token.pubkey && (
                <div className="flex items-baseline gap-2">
                    <span className="w-24 shrink-0 text-outer-space-300">Account</span>
                    <div className="min-w-0 flex-1">
                        <Address pubkey={new PublicKey(token.pubkey)} link />
                    </div>
                </div>
            )}
            <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 self-baseline text-outer-space-300">Mint</span>
                <ProxiedImage
                    alt="Token icon"
                    className="h-6 w-6 shrink-0 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
                <div className="min-w-0 flex-1">
                    <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 text-outer-space-300">
                    {showAccountAddress ? 'Total Balance' : 'Balance'}
                </span>
                <span className="min-w-0 flex-1 break-words">
                    {token.amount}
                    <ScaledUiAmountMultiplierTooltip
                        rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                        scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                    />
                </span>
            </div>
        </div>
    );
}

function GridTokenRow({ mintAddress, token, showAccountAddress }: TokenRowProps) {
    const { cluster, genesisHash } = useCluster();
    // Same lazy per-row enrichment as the table `TokenRow`: one batched useTokenInfo fetch per mint.
    const tokenInfo = useTokenInfo(true, mintAddress, cluster, genesisHash);

    return (
        <div role="row" className="contents">
            <div role="cell" className={gridCellVariants({ column: 'logo' })}>
                <ProxiedImage
                    alt="Token icon"
                    className="h-6 w-6 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
            </div>
            {showAccountAddress && token.pubkey && (
                <div role="cell" className={gridCellVariants({ column: 'address' })}>
                    <Address pubkey={new PublicKey(token.pubkey)} link />
                </div>
            )}
            <div role="cell" className={gridCellVariants({ column: 'address' })}>
                <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
            </div>
            <div role="cell" className={gridCellVariants({ column: 'balance' })}>
                {token.amount}
                <ScaledUiAmountMultiplierTooltip
                    rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                    scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                />
            </div>
        </div>
    );
}

function TokensCardFooter({
    tokens,
    visibleCount,
    loadMore,
}: {
    tokens: TokenInfoWithPubkey[];
    visibleCount: number;
    loadMore: () => void;
}) {
    // Count unique mints to get actual token count (not account count)
    const totalCount = useMemo(() => {
        const uniqueMints = new Set(tokens.map(t => t.info.mint.toBase58()));
        return uniqueMints.size;
    }, [tokens]);

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
