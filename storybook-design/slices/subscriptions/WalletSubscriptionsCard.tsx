'use client';

// Local design-slice copy of app/features/subscriptions/ui/WalletSubscriptionsCard.tsx.
// Each block (Hint / Plans / Subscriptions / Delegations / Received*) is exported here so it can
// be iterated on as an isolated Storybook entity without touching production code. The three
// relative imports were rewritten to absolute @/app paths; everything else is verbatim.

import { KitAddress } from '@components/common/KitAddress';
import { ExternalLink } from '@components/shared/ui/external-link';
import type { Address } from '@solana/kit';
import type {
    FixedDelegation,
    PlanWithAddress,
    RecurringDelegation,
    SubscriptionDelegation,
} from '@solana/subscriptions';
import { pluralUnits } from '@utils/index';
import { ExternalLink as ExternalLinkIcon, Info } from 'react-feather';

import type { ReactNode } from 'react';

import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

import { SUBSCRIPTIONS_REPO_URL } from '@/app/features/subscriptions/lib/constants';
import { displayExpiry } from '@/app/features/subscriptions/lib/format';
import {
    useWalletDelegations,
    useWalletPlans,
    type WalletDelegationsData,
    type WalletPlansData,
} from '@/app/features/subscriptions/model/useWalletSubscriptions';

import { HEADER_CELLS, ROW_CELLS, SectionCard } from './SectionCard';

export function WalletSubscriptionsCard({ address }: { address: string }) {
    const { data: delegationsData } = useWalletDelegations(address);
    const { data: plansData } = useWalletPlans(address);

    if (!delegationsData || !plansData) return;

    return <WalletSubscriptionsView {...delegationsData} {...plansData} />;
}

export function WalletSubscriptionsView({
    delegations,
    delegationsReceived,
    plans,
}: WalletDelegationsData & WalletPlansData) {
    const subscriptions = delegations.filter((d): d is SubscriptionItem => d.kind === 'subscription');
    const standalone = delegations.filter(
        (d): d is StandaloneDelegation => d.kind === 'fixed' || d.kind === 'recurring',
    );
    const receivedSubscriptions = delegationsReceived.filter((d): d is SubscriptionItem => d.kind === 'subscription');
    const standaloneReceived = delegationsReceived.filter(
        (d): d is StandaloneDelegation => d.kind === 'fixed' || d.kind === 'recurring',
    );

    if (
        plans.length === 0 &&
        subscriptions.length === 0 &&
        standalone.length === 0 &&
        receivedSubscriptions.length === 0 &&
        standaloneReceived.length === 0
    ) {
        return (
            <>
                <SubscriptionsHint />
                <div className="p-4 text-center text-muted">No subscriptions found for this address.</div>
            </>
        );
    }

    return (
        <>
            {/* The info block lives under the Plans title (PlansSection renders it as its note).
                With no plans, fall back to showing it standalone at the top of the tab. */}
            {plans.length > 0 ? <PlansSection plans={plans} /> : <SubscriptionsHint />}
            {subscriptions.length > 0 && <SubscriptionsSection delegations={subscriptions} />}
            {standalone.length > 0 && <DelegationsSection delegations={standalone} />}
            {receivedSubscriptions.length > 0 && <ReceivedSubscriptionsSection delegations={receivedSubscriptions} />}
            {standaloneReceived.length > 0 && <ReceivedDelegationsSection delegations={standaloneReceived} />}
        </>
    );
}

// A subtle info note explaining what this tab lists, with a link to the program's source.
// No bottom margin — spacing is owned by the SectionCard layout that places it under the Plans title.
export function SubscriptionsHint() {
    return (
        <div className="flex items-start gap-2 rounded-dk border border-solid border-dk-gray-700-dark bg-dk-gray-800-dark px-4 py-3 text-dk-sm text-muted">
            <Info aria-hidden className="mt-0.5 shrink-0 text-dk-info" size={15} />
            <span>
                Here you can see all subscriptions handled by the{' '}
                <ExternalLink
                    className="whitespace-nowrap text-dk-primary-dark hover:underline"
                    href={SUBSCRIPTIONS_REPO_URL}
                >
                    Subscriptions program
                    <ExternalLinkIcon className="ml-1 inline align-text-top" size={12} />
                </ExternalLink>
                .
            </span>
        </div>
    );
}

export type SubscriptionItem = { address: Address; data: SubscriptionDelegation; kind: 'subscription' };

export type StandaloneDelegation =
    | { address: Address; data: FixedDelegation; kind: 'fixed' }
    | { address: Address; data: RecurringDelegation; kind: 'recurring' };

export function PlansSection({ plans }: { plans: PlanWithAddress[] }) {
    const columns: Column<PlanWithAddress>[] = [
        { label: 'Account', primary: true, render: p => <KitAddress address={p.address} raw link /> },
        { label: 'Plan ID', mdMergeIntoPrev: true, render: p => p.data.data.planId.toString() },
        { label: 'Token Mint', render: p => <KitAddress address={p.data.data.mint} raw link /> },
        { label: 'Amount per Period', render: p => p.data.data.terms.amount.toString() },
        { label: 'Period', render: p => pluralUnits(p.data.data.terms.periodHours, 'hour') },
        { label: 'Expires', render: p => displayExpiry(p.data.data.endTs) },
    ];
    return <TableSection columns={columns} note={<SubscriptionsHint />} rows={plans} title="Plans" />;
}

export function SubscriptionsSection({
    delegations,
}: {
    delegations: Array<{ address: Address; data: SubscriptionDelegation }>;
}) {
    const columns: Column<{ address: Address; data: SubscriptionDelegation }>[] = [
        { label: 'Account', primary: true, render: d => <KitAddress address={d.address} raw link /> },
        { label: 'Delegatee', render: d => <KitAddress address={d.data.header.delegatee} raw link /> },
        { label: 'Amount per Period', render: d => d.data.terms.amount.toString() },
        { label: 'Period', render: d => pluralUnits(d.data.terms.periodHours, 'hour') },
        { label: 'Expires', render: d => displayExpiry(d.data.expiresAtTs) },
    ];
    return <TableSection columns={columns} rows={delegations} title="Subscriptions" />;
}

export function DelegationsSection({ delegations }: { delegations: StandaloneDelegation[] }) {
    const columns: Column<StandaloneDelegation>[] = [
        { label: 'Account', primary: true, render: d => <KitAddress address={d.address} raw link /> },
        { label: 'Type', render: d => (d.kind === 'fixed' ? 'Fixed' : 'Recurring') },
        { label: 'Delegatee', render: d => <KitAddress address={d.data.header.delegatee} raw link /> },
        { label: 'Amount', render: d => (d.kind === 'fixed' ? d.data.amount : d.data.amountPerPeriod).toString() },
        { label: 'Expires', render: d => displayExpiry(d.data.expiryTs) },
    ];
    return <TableSection columns={columns} rows={delegations} title="Delegations" />;
}

// Incoming subscriptions where this wallet is the delegatee (i.e. the merchant/puller),
// so the counterparty of interest is the delegator (the subscriber).
export function ReceivedSubscriptionsSection({
    delegations,
}: {
    delegations: Array<{ address: Address; data: SubscriptionDelegation }>;
}) {
    const columns: Column<{ address: Address; data: SubscriptionDelegation }>[] = [
        { label: 'Account', primary: true, render: d => <KitAddress address={d.address} raw link /> },
        { label: 'Delegator', render: d => <KitAddress address={d.data.header.delegator} raw link /> },
        { label: 'Amount per Period', render: d => d.data.terms.amount.toString() },
        { label: 'Period', render: d => pluralUnits(d.data.terms.periodHours, 'hour') },
        { label: 'Expires', render: d => displayExpiry(d.data.expiresAtTs) },
    ];
    return <TableSection columns={columns} rows={delegations} title="Received Subscriptions" />;
}

export function ReceivedDelegationsSection({ delegations }: { delegations: StandaloneDelegation[] }) {
    const columns: Column<StandaloneDelegation>[] = [
        { label: 'Account', primary: true, render: d => <KitAddress address={d.address} raw link /> },
        { label: 'Type', render: d => (d.kind === 'fixed' ? 'Fixed' : 'Recurring') },
        { label: 'Delegator', render: d => <KitAddress address={d.data.header.delegator} raw link /> },
        { label: 'Amount', render: d => (d.kind === 'fixed' ? d.data.amount : d.data.amountPerPeriod).toString() },
        { label: 'Expires', render: d => displayExpiry(d.data.expiryTs) },
    ];
    return <TableSection columns={columns} rows={delegations} title="Received Delegations" />;
}

// One column of a section, defined ONCE and reused for both layouts. `primary` marks the column that
// becomes a mobile card's heading line (usually Account); everything else renders as a Label → value row.
type Column<T> = {
    label: string;
    primary?: boolean;
    render: (row: T) => ReactNode;
    // md-band-only (769–992px) column merge, used by Plans for Account + Plan ID. When set, this
    // column is folded into the PREVIOUS column in the wide table *only across the md tier*: its own
    // <th>/<td> is hidden (`hidden lg:table-cell`), the previous header gains a ` / <label>` suffix,
    // and its value renders as a second line under the previous column's value. At lg+ the two columns
    // split back apart, and the mobile card stack (below md) always lists it as its own labelled row.
    mdMergeIntoPrev?: boolean;
};

// Shared section shell used by every block above. Title lives OUTSIDE the card (see SectionCard),
// which also carries the Expand/Collapse control. Two layouts from one `columns` definition, split on
// the standard `md` breakpoint (this project pins `md` to 769px):
//   • md and up — the wide table (unchanged; ROW_CELLS/HEADER_CELLS styling, horizontal scroll inside
//     the card if it doesn't fit).
//   • below md — explorer.solana.com's mobile treatment: each row collapses into its own card, every
//     column a `Label → value` line (label muted left, value right), the Account line as the heading.
function TableSection<T extends { address: Address }>({
    columns,
    note,
    rows,
    title,
}: {
    columns: Column<T>[];
    note?: ReactNode;
    rows: T[];
    title: string;
}) {
    return (
        <SectionCard bare collapsible note={note} title={title}>
            <Card ui="dashkit" marginBottom="none" className="!mb-0 hidden md:block !border-outer-space-800">
                <BaseTable ui="dashkit" variant="card" nowrap className={`${ROW_CELLS} ${HEADER_CELLS}`}>
                    <BaseTable.Head>
                        <BaseTable.Row>
                            {columns.map((c, i) => {
                                // The merged-away column (e.g. Plan ID): its own header is hidden across
                                // the md tier and returns at lg.
                                if (c.mdMergeIntoPrev) {
                                    return (
                                        <BaseTable.HeaderCell key={c.label} className="hidden lg:table-cell">
                                            {c.label}
                                        </BaseTable.HeaderCell>
                                    );
                                }
                                // Host header (e.g. Account) gains a ` / <label>` suffix while its
                                // neighbour is folded in — only across the md tier.
                                const merged = columns[i + 1]?.mdMergeIntoPrev ? columns[i + 1] : undefined;
                                return (
                                    <BaseTable.HeaderCell key={c.label}>
                                        {c.label}
                                        {merged && <span className="lg:hidden"> / {merged.label}</span>}
                                    </BaseTable.HeaderCell>
                                );
                            })}
                        </BaseTable.Row>
                    </BaseTable.Head>
                    <BaseTable.Body>
                        {rows.map(row => (
                            <BaseTable.Row key={row.address}>
                                {columns.map((c, i) => {
                                    if (c.mdMergeIntoPrev) {
                                        return (
                                            <BaseTable.Cell key={c.label} className="hidden lg:table-cell">
                                                {c.render(row)}
                                            </BaseTable.Cell>
                                        );
                                    }
                                    const merged = columns[i + 1]?.mdMergeIntoPrev ? columns[i + 1] : undefined;
                                    return (
                                        <BaseTable.Cell key={c.label}>
                                            {c.render(row)}
                                            {merged && (
                                                <div className="mt-1 lg:hidden">{merged.render(row)}</div>
                                            )}
                                        </BaseTable.Cell>
                                    );
                                })}
                            </BaseTable.Row>
                        ))}
                    </BaseTable.Body>
                </BaseTable>
            </Card>
            <Card ui="dashkit" marginBottom="none" className="!mb-0 divide-y divide-white/10 md:hidden !border-outer-space-800">
                {rows.map(row => (
                    <RowCard key={row.address} columns={columns} row={row} />
                ))}
            </Card>
        </SectionCard>
    );
}

// One table row rendered as a block inside the shared mobile panel (the rows aren't clickable, so there
// is no per-row card chrome/gap — the parent <Card> holds them all, divided by `divide-y` lines, like
// the desktop table). Styled after the program-account TransactionHistoryCard mobile treatment: every
// column is a left-aligned `label | value` line (no heading/divider), block padding 8/12, each field
// row `py-0.5` (2px) with `items-baseline` and a 12px gap. Label is a muted (outer-space-300) `text-sm`
// column with a fixed `w-20` (80px) — a uniform width is what lets every value align to one left edge,
// including the wrapped one: "Token Mint" (70px) still fits on one line while "Amount per Period" wraps
// to two lines INSIDE the column instead of pushing its value out. Value `text-sm`, left-aligned,
// `flex-1 min-w-0` so addresses truncate within the panel. (First pass — no drawer/tap-target port.)
function RowCard<T>({ columns, row }: { columns: Column<T>[]; row: T }) {
    return (
        <div className="px-3 py-2">
            <dl className="m-0 flex flex-col">
                {columns.map(c => (
                    <div key={c.label} className="flex items-baseline gap-3 py-0.5">
                        <dt className="w-20 shrink-0 text-sm font-normal text-outer-space-300">{c.label}</dt>
                        <dd className="m-0 min-w-0 flex-1 text-sm">{c.render(row)}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
