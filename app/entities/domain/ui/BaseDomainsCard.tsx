'use client';

import { Address } from '@components/common/Address';
import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { cn } from '@components/shared/utils';
import { PublicKey } from '@solana/web3.js';
import React, { useMemo } from 'react';

import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

import { DomainInfo } from '../model/types';

type ValidDomain = DomainInfo & { pubkey: PublicKey };

// Column labels shared by both layouts so the header copy can't drift between table and grid.
const COLUMNS = ['Domain', 'Name Service Account'] as const;

export type DomainsLayout = 'table' | 'grid';

// The card is a lifted-heading collapsible section (heading above the surface + chevron toggle + the
// `1fr`/`0fr` height animation), provided by the shared `CollapsibleCard` in `headingPlacement="lifted"`.
//
// `layout` picks how the domain list is rendered inside the surface:
// - `table` (default) — the shared `<BaseTable>` (a real `<table>`).
// - `grid` — a CSS-grid list built from `div`s, mirroring the transaction page's Accounts/Token
//   Balances tables. Desktop visuals are identical to `table`; the internals differ so the two can
//   diverge on mobile later.
export function BaseDomainsCard({ domains, layout = 'table' }: { domains: DomainInfo[]; layout?: DomainsLayout }) {
    const validDomains = useMemo(
        () =>
            domains
                .map(domain => ({ ...domain, pubkey: tryPublicKey(domain.address) }))
                .filter((d): d is ValidDomain => d.pubkey !== null),
        [domains],
    );

    return (
        <CollapsibleCard title="Owned Domain Names" headingPlacement="lifted">
            {/* The grid layout is the Tailwind path (tight tw card); the table layout keeps its
                original dashkit surface so its `#282d2b` row separators stay unchanged. */}
            {layout === 'grid' ? (
                // Surface matched to the transaction Tokens/Accounts card, in pure Tailwind: bg
                // `outer-space-900` equals `#1e2423` (dashkit `dk-gray-800-dark`); `border-outer-space-800`
                // gives the card the same tone as the row separators; `rounded-lg` is the 8px radius.
                // BaseCard uses `cnPrefixed` (tailwind-merge), so these override the tw variant's defaults.
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    <DomainsGrid domains={validDomains} />
                </Card>
            ) : (
                <Card ui="dashkit">
                    <DomainsTable domains={validDomains} />
                </Card>
            )}
        </CollapsibleCard>
    );
}

// `<table>` layout — the shared BaseTable (dashkit `ui="dashkit"`, `#282d2b` separators) with the
// `subtle` head/body styling.
function DomainsTable({ domains }: { domains: ValidDomain[] }) {
    // No table-wide `nowrap`: in `table-layout: auto` a nowrap name is unbreakable, so its column grows
    // to fit the longest name. Instead nowrap stays per-cell (headers + account), and the name cell gets
    // `break-all` so its min-content collapses and the column stays sized by the rest of the row.
    //
    // `[&_tbody_td]:align-top` top-aligns the body row (matching the grid's `items-start`): a wrapped
    // multi-line name lines up with the account's first line. It's `.table tbody td` (0,1,2), deliberately
    // out-specifying the `ui` variant's `[&_td]:align-middle` (0,1,1) since `cn` here is clsx, not merge.
    return (
        <BaseTable ui="dashkit" variant="card" head="subtle" body="subtle" className="[&_tbody_td]:align-top">
            <BaseTable.Head>
                <BaseTable.Row>
                    {COLUMNS.map(label => (
                        <BaseTable.HeaderCell key={label} className="whitespace-nowrap">
                            {label}
                        </BaseTable.HeaderCell>
                    ))}
                </BaseTable.Row>
            </BaseTable.Head>
            <BaseTable.Body>
                {domains.map(domain => (
                    <BaseTable.Row key={domain.address}>
                        <BaseTable.Cell className="break-all">{domain.name}</BaseTable.Cell>
                        <BaseTable.Cell className="whitespace-nowrap">
                            <Address pubkey={domain.pubkey} link />
                        </BaseTable.Cell>
                    </BaseTable.Row>
                ))}
            </BaseTable.Body>
        </BaseTable>
    );
}

// CSS-grid layout — a single 2-column grid so columns stay aligned across header and rows the way a
// `<table>`'s shared columns do. Pure Tailwind, matching the transaction page's Accounts/Token Balances
// tables: muted uppercase `text-xs` header, `text-sm` body, `outer-space-800` row separators (same tone
// as the card border), transparent (card-matching) background, 8px/12px padding.
//
// Domain column sizing — content-aware within a fixed px band, no JS:
// - `fit-content(clamp(200px,50%,400px))` is the *ceiling*: the column grows with the domain content up
//   to a 50% band (px-clamped 200–400), then the name wraps (`break-all`) instead of growing further.
// - `min-w-[clamp(120px,25%,200px)]` on the body cell is the *floor*: it feeds `fit-content`'s minimum,
//   so short names still rest at the current ~25% band (px-clamped 120–200). Net: the column breathes
//   between the 25% and 50% bands driven purely by content. The account column keeps the rest (`1fr`).
const GRID_HEADER_CELL = 'flex items-center whitespace-nowrap px-3 py-2 text-xs uppercase text-outer-space-300';
// Shared body-cell styling. `min-width` is set per cell below (a floor on the name, `0` on the account)
// so it isn't baked in here — `cn` is clsx, so a base `min-w-*` couldn't be overridden per cell.
const GRID_BODY_CELL = 'flex items-start border-t border-solid border-outer-space-800 px-3 py-2';
const GRID_DOMAIN_FLOOR = 'min-w-[clamp(120px,25%,200px)]';

function DomainsGrid({ domains }: { domains: ValidDomain[] }) {
    return (
        <div className="w-full overflow-x-auto text-sm text-white">
            <div className="grid min-w-full grid-cols-[fit-content(clamp(200px,50%,400px))_1fr]">
                {COLUMNS.map(label => (
                    <div key={label} className={GRID_HEADER_CELL}>
                        {label}
                    </div>
                ))}
                {domains.map(domain => (
                    <React.Fragment key={domain.address}>
                        {/* A domain name is a single spaceless token, so `break-all` is what lets it wrap
                            once the column reaches its `fit-content` ceiling. `min-w` sets the floor. */}
                        <div className={cn(GRID_BODY_CELL, GRID_DOMAIN_FLOOR, 'break-all')}>{domain.name}</div>
                        <div className={cn(GRID_BODY_CELL, 'min-w-0 whitespace-nowrap')}>
                            <Address pubkey={domain.pubkey} link />
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function tryPublicKey(address: string): PublicKey | null {
    try {
        return new PublicKey(address);
    } catch {
        return null;
    }
}
