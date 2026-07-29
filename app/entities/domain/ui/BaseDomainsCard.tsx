'use client';

import { Address } from '@components/common/Address';
import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { PublicKey } from '@solana/web3.js';
import React, { useId, useMemo, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

import { DomainInfo } from '../model/types';

type ValidDomain = DomainInfo & { pubkey: PublicKey };

// Column labels shared by both layouts so the header copy can't drift between table and grid.
const COLUMNS = ['Domain', 'Name Service Account'] as const;

export type DomainsLayout = 'table' | 'grid';

// Collapsible section mirroring @features/transaction's CollapsibleSection: heading lifted out above
// the card + a chevron toggle + the grid `1fr`/`0fr` height animation. Rebuilt locally on shared
// primitives because FSD forbids entity → feature imports; drop this in favour of a shared
// CollapsibleSection once that lands (the `dk-*` header work is shelved on commit f2950869).
//
// `layout` picks how the domain list is rendered inside the card:
// - `table` (default) — the shared `<BaseTable>` (a real `<table>`).
// - `grid` — a CSS-grid list built from `div`s, mirroring the transaction page's Accounts/Token
//   Balances tables. Desktop visuals are identical to `table`; the internals differ so the two can
//   diverge on mobile later.
export function BaseDomainsCard({ domains, layout = 'table' }: { domains: DomainInfo[]; layout?: DomainsLayout }) {
    const [expanded, setExpanded] = useState(true);
    const headingId = useId();

    const validDomains = useMemo(
        () =>
            domains
                .map(domain => ({ ...domain, pubkey: tryPublicKey(domain.address) }))
                .filter((d): d is ValidDomain => d.pubkey !== null),
        [domains],
    );

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 id={headingId} className="m-0 text-lg font-normal text-white">
                    Owned Domain Names
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    className="md:min-w-[86px]"
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    onClick={() => setExpanded(v => !v)}
                >
                    <ChevronDown
                        size={12}
                        className={cn(
                            'transition-transform duration-200 ease-in-out',
                            expanded && '[transform:rotate(180deg)]',
                        )}
                    />
                    <span className="hidden md:inline-block">{expanded ? 'Collapse' : 'Expand'}</span>
                </Button>
            </div>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-in-out',
                    expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden">
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
                </div>
            </div>
        </section>
    );
}

// `<table>` layout — the shared BaseTable (dashkit `ui="dashkit"`, `#282d2b` separators) with the
// `subtle` head/body styling.
function DomainsTable({ domains }: { domains: ValidDomain[] }) {
    return (
        <BaseTable ui="dashkit" variant="card" head="subtle" body="subtle" nowrap>
            <BaseTable.Head>
                <BaseTable.Row>
                    {COLUMNS.map(label => (
                        <BaseTable.HeaderCell key={label}>{label}</BaseTable.HeaderCell>
                    ))}
                </BaseTable.Row>
            </BaseTable.Head>
            <BaseTable.Body>
                {domains.map(domain => (
                    <BaseTable.Row key={domain.address}>
                        <BaseTable.Cell>{domain.name}</BaseTable.Cell>
                        <BaseTable.Cell>
                            <Address pubkey={domain.pubkey} link />
                        </BaseTable.Cell>
                    </BaseTable.Row>
                ))}
            </BaseTable.Body>
        </BaseTable>
    );
}

// CSS-grid layout — a single 2-column grid so columns stay aligned across header and rows the way a
// `<table>`'s shared columns do. The domain column is `clamp(120px, 25%, 200px)`; the account column
// takes the rest (`1fr`). Pure Tailwind, matching the transaction page's Accounts/Token Balances
// tables: muted uppercase `text-xs` header, `text-sm` body, `outer-space-800` row separators (same tone
// as the card border), transparent (card-matching) background, 8px/12px padding.
const GRID_HEADER_CELL = 'flex items-center whitespace-nowrap px-3 py-2 text-xs uppercase text-outer-space-300';
const GRID_BODY_CELL = 'flex items-center whitespace-nowrap border-t border-solid border-outer-space-800 px-3 py-2';

function DomainsGrid({ domains }: { domains: ValidDomain[] }) {
    return (
        <div className="w-full overflow-x-auto text-sm text-white">
            <div className="grid min-w-full grid-cols-[clamp(120px,25%,200px)_1fr]">
                {COLUMNS.map(label => (
                    <div key={label} className={GRID_HEADER_CELL}>
                        {label}
                    </div>
                ))}
                {domains.map(domain => (
                    <React.Fragment key={domain.address}>
                        <div className={GRID_BODY_CELL}>{domain.name}</div>
                        <div className={GRID_BODY_CELL}>
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
