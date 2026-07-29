'use client';

// Independent composition root for the "Enhancements" tx-inspector page. It re-implements only the
// signature (permalink) path of InspectorPage — the sole path the design slice renders — so the
// Enhancements page owns its own page wrapper, PermalinkView, LoadedView and OverviewCard. Leaf
// sections (SimulatorCard, AccountsCard, …) are the shared vendor components for now; to enhance one
// without affecting Default, add a `*.enhancements.tsx` variant and swap its import in here only.
// Nothing that Default renders is touched.
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';
import { useFetchAccountInfo } from '@providers/accounts';
import { FetchStatus } from '@providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@providers/transactions/raw';
import { PACKET_DATA_SIZE, type VersionedMessage } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { useSimulation } from '@/app/features/instruction-simulation/model/use-simulation';
import { useCluster } from '@/app/providers/cluster';
import { DownloadDropdown } from '@/app/shared/components/DownloadDropdown';
import { Card } from '@/app/shared/ui/Card';
import { StickyHeader } from '@/app/shared/ui/sticky-header/StickyHeader';
import { useClusterPath } from '@/app/utils/url';

import { SimulationSections } from '../../features/instruction-simulation/ui/SimulationSections';
// Vendored BaseNavigationTabs (adds `disabled` tab support) — the app original can't render the
// disabled Logs / CU profiling / SOL Balance Changes tabs shown before a simulation runs.
import { BaseNavigationTabs } from '../../shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { PageContainer } from '../../shared/ui/page-container/PageContainer';
import { AccountsCard } from './AccountsCard';
import { AddressTableLookupsCard } from './AddressTableLookupsCard';
import { AddressWithContext, createFeePayerValidator } from './AddressWithContext';
import type { TransactionData } from './InspectorPage';
import { InstructionsSection } from './InstructionsSection';
import { TransactionSignatures } from './SignaturesCard';

export function TransactionInspectorPageEnhancements({
    signature,
    showTokenBalanceChanges,
}: {
    signature: string;
    showTokenBalanceChanges: boolean;
}) {
    const router = useRouter();
    const inspectorPath = useClusterPath({ pathname: '/tx/inspector' });
    const resetToInspectorPage = React.useCallback(() => {
        router.push(inspectorPath);
    }, [inspectorPath, router]);

    return (
        <PageContainer width="fluid" className="mt-6 [&_.border-dk-card-outline-dark]:border-outer-space-800">
            <header className="mb-3 mt-4 flex flex-col gap-1.5 py-6">
                <span className="text-xs font-normal uppercase text-muted">Transaction</span>
                <h1 className="m-0 text-2xl font-normal leading-none text-white md:text-3xl">Inspector</h1>
            </header>
            <PermalinkView
                signature={signature}
                reset={resetToInspectorPage}
                showTokenBalanceChanges={showTokenBalanceChanges}
            />
        </PageContainer>
    );
}

function PermalinkView({
    signature,
    reset,
    showTokenBalanceChanges,
}: {
    signature: string;
    reset: () => void;
    showTokenBalanceChanges: boolean;
}) {
    const details = useRawTransactionDetails(signature);
    const fetchTransaction = useFetchRawTransaction();
    const { status } = useCluster();
    const transaction = details?.data?.raw;

    const fetchConfirmedTx = React.useCallback(() => {
        fetchTransaction(signature, 'confirmed');
    }, [fetchTransaction, signature]);

    React.useEffect(() => {
        if (!transaction && status === ClusterStatus.Connected) {
            fetchConfirmedTx();
        }
    }, [transaction, fetchConfirmedTx, status]);

    if (!details || details.status === FetchStatus.Fetching) {
        return <LoadingCard />;
    } else if (details.status === FetchStatus.FetchFailed) {
        return <ErrorCard retry={fetchConfirmedTx} text="Failed to fetch transaction" />;
    } else if (!transaction) {
        return <ErrorCard text="Transaction was not found" retry={reset} retryText="Reset" />;
    }

    const { message, signatures, meta } = transaction;
    const tx = {
        accountBalances: meta,
        compiledInnerInstructions: meta?.innerInstructions,
        message,
        rawMessage: message.serialize(),
        signatures,
    };
    return <LoadedView transaction={tx} onClear={reset} showTokenBalanceChanges={showTokenBalanceChanges} />;
}

// Tab bar sections (everything below Overview). `path` doubles as the anchor id on the matching
// section wrapper, so `buildHref` (`#<path>`) scrolls to it. `gated` tabs (the simulation-derived
// Logs / CU profiling / SOL Balance Changes) are shown disabled until a simulation has run.
const BASE_TABS: { path: string; title: string; gated?: boolean; requiresSignatures?: boolean }[] = [
    { path: 'simulation', title: 'Simulation' },
    { gated: true, path: 'logs', title: 'Logs' },
    { gated: true, path: 'cu-profiling', title: 'CU profiling' },
    { gated: true, path: 'sol-balance-changes', title: 'SOL Balance Changes' },
    { path: 'signatures', requiresSignatures: true, title: 'Signatures' },
    { path: 'accounts', title: 'Accounts' },
    { path: 'address-lookups', title: 'Address Lookups' },
    { path: 'instructions', title: 'Instructions' },
];

// Highlights the tab whose section is currently pinned under the sticky bar as the page scrolls.
// active = the last section whose top has passed just below the bar (bar height + a small band).
// We replicate this here (rather than use BaseNavigationTabs' own scrollSpy) to keep the StickyHeader
// layout, and use a small fixed band instead of scrollSpy's 30%-of-viewport threshold, which is too
// large for this page's short sections (Signatures/Address Lookups) and would skip past them. The
// sticky bar height comes from --sticky-header-height, which StickyHeader publishes.
const SPY_BAND = 32;
function useScrollSpy(tabs: { path: string }[]) {
    const paths = React.useMemo(() => tabs.map(t => t.path), [tabs]);
    const [active, setActive] = React.useState(() => paths[0] ?? '');

    React.useEffect(() => {
        const update = () => {
            const bar =
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky-header-height')) || 0;
            const threshold = window.scrollY + bar + SPY_BAND;
            let current = paths[0] ?? '';
            for (const path of paths) {
                const el = document.getElementById(path);
                if (el && el.getBoundingClientRect().top + window.scrollY <= threshold) {
                    current = path;
                }
            }
            setActive(current);
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
        return () => window.removeEventListener('scroll', update);
    }, [paths]);

    return active;
}

function LoadedView({
    transaction,
    onClear,
    showTokenBalanceChanges,
}: {
    transaction: TransactionData;
    onClear: () => void;
    showTokenBalanceChanges: boolean;
}) {
    const { message, rawMessage, signatures, accountBalances, compiledInnerInstructions } = transaction;

    const fetchAccountInfo = useFetchAccountInfo();
    React.useEffect(() => {
        for (const lookup of message.addressTableLookups) {
            fetchAccountInfo(lookup.accountKey, 'parsed');
        }
    }, [message, fetchAccountInfo]);

    // Simulation state is owned here (not inside a section) so the tab bar can gate the
    // simulation-derived tabs until it resolves, and SimulationSections can render off the same state.
    const simulation = useSimulation(message, accountBalances);
    const simDone = simulation.status === 'done';

    const hasSignatures = Boolean(signatures);
    const tabs = React.useMemo(
        () =>
            BASE_TABS.filter(t => !(t.requiresSignatures && !hasSignatures)).map(t => ({
                disabled: Boolean(t.gated) && !simDone,
                path: t.path,
                title: t.title,
            })),
        [hasSignatures, simDone],
    );

    // Active tab follows the scroll position.
    const activeTab = useScrollSpy(tabs);

    // TabLink renders a Next.js <Link scroll={false}>, so a plain click never scrolls — we drive the
    // scroll ourselves. scrollIntoView honours each section's scroll-margin-top (below), which offsets
    // by the sticky tab bar's height (StickyHeader publishes it as --sticky-header-height) so the
    // target lands just under the bar instead of behind it.
    const scrollToSection = React.useCallback((path: string) => {
        document.getElementById(path)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    // Overview stays above the tab bar; the tab bar (subscriptions-slice layout: StickyHeader whose
    // `-mx-3` full-bleed is restored with `px-3` and re-centred on the 960px content column) navigates
    // the sections below it. Block spacing mirrors the transaction details page.
    return (
        <>
            <OverviewCard message={message} raw={rawMessage} onClear={onClear} />
            {/* `ml-[calc(50%-50vw)] w-screen` makes the bar (its bg + bottom border) full-bleed to the
                viewport edges even when unstuck — StickyHeader only does that itself once stuck (inline
                style, which wins there), so unstuck the underline would otherwise stop at the content
                column. `overflow-x-clip` trims the extra 12px that StickyHeader's unstuck inner `-mx-3`
                would push past the now-100vw bar (which would otherwise cause a horizontal scrollbar);
                clip keeps sticky working and leaves the vertical axis visible for the overflow menu. */}
            <StickyHeader className="mt-9 ml-[calc(50%-50vw)] w-screen overflow-x-clip lg:mt-12">
                {/* The inner `ml-[calc(50%-50vw)] w-screen` re-anchors the tab column to the viewport,
                    neutralising StickyHeader's own `-mx-3` (applied only when unstuck). On desktop that
                    -12px shift is absorbed by the 960px column's auto side-margins, but on mobile there
                    are none, so the tabs would otherwise sit flush against the screen edge instead of on
                    the page gutter. Re-anchoring first, then re-centring the 960px + px-3 column, keeps
                    the tabs on the same gutter as every page block in BOTH stuck and unstuck states —
                    while the bar's bg + bottom border stay full-bleed to the edges. */}
                <div className="ml-[calc(50%-50vw)] w-screen">
                    <div className="mx-auto w-full max-w-[960px] px-3">
                        <BaseNavigationTabs
                            activeValue={activeTab}
                            buildHref={path => `#${path}`}
                            onTabClick={path => scrollToSection(path)}
                            onSelectChange={scrollToSection}
                            tabs={tabs}
                        />
                    </div>
                </div>
            </StickyHeader>
            <div className="flex flex-col space-y-9 lg:space-y-12">
                <SimulationSections
                    simulation={simulation}
                    message={message}
                    showTokenBalanceChanges={showTokenBalanceChanges}
                    anchorStyle={SECTION_ANCHOR_STYLE}
                />
                {signatures && (
                    <div id="signatures" style={SECTION_ANCHOR_STYLE}>
                        <TransactionSignatures message={message} signatures={signatures} rawMessage={rawMessage} />
                    </div>
                )}
                <div id="accounts" style={SECTION_ANCHOR_STYLE}>
                    <AccountsCard message={message} />
                </div>
                <div id="address-lookups" style={SECTION_ANCHOR_STYLE}>
                    <AddressTableLookupsCard message={message} />
                </div>
                <div id="instructions" style={SECTION_ANCHOR_STYLE}>
                    <InstructionsSection message={message} compiledInnerInstructions={compiledInnerInstructions} />
                </div>
            </div>
        </>
    );
}

// Offsets anchor scrolling by the sticky tab bar height (+12px gap) so a section lands under the bar.
const SECTION_ANCHOR_STYLE: React.CSSProperties = {
    scrollMarginTop: 'calc(var(--sticky-header-height, 0px) + 12px)',
};

const DEFAULT_FEES = {
    lamportsPerSignature: 5000,
};

function OverviewCard({
    message,
    raw,
    onClear,
    signature,
}: {
    message: VersionedMessage;
    raw: Uint8Array;
    onClear: () => void;
    signature?: string;
}) {
    const fee = message.header.numRequiredSignatures * DEFAULT_FEES.lamportsPerSignature;
    const feePayerValidator = createFeePayerValidator(fee);

    const size = React.useMemo(() => {
        const sigBytes = 1 + 64 * message.header.numRequiredSignatures;
        return sigBytes + raw.length;
    }, [message, raw]);

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-normal text-white">Overview</h2>
                <div className="flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="sm" onClick={onClear}>
                        Clear
                    </Button>
                    <DownloadDropdown filename={signature || 'signature'} data={raw} />
                </div>
            </div>
            <Card ui="dashkit">
                <OverviewRow divider>
                    <OverviewLabel>Serialized Size / Limit</OverviewLabel>
                    <OverviewValue>
                        <span className={size > PACKET_DATA_SIZE ? 'text-dk-warning-on-dark' : undefined}>
                            {size} / {PACKET_DATA_SIZE} bytes
                        </span>
                    </OverviewValue>
                </OverviewRow>
                <OverviewRow divider>
                    <OverviewLabel>Fees</OverviewLabel>
                    <OverviewValue>
                        <SolBalance lamports={fee} />
                    </OverviewValue>
                </OverviewRow>
                <OverviewRow>
                    <OverviewLabel>Fee payer</OverviewLabel>
                    <OverviewValue>
                        {message.staticAccountKeys.length === 0 ? (
                            'No Fee Payer'
                        ) : (
                            <AddressWithContext
                                pubkey={message.staticAccountKeys[0]}
                                validator={feePayerValidator}
                                align="left"
                                hideInfo
                                badges={
                                    <span className="mt-1 flex flex-wrap gap-1.5">
                                        <Badge ui="dashkit" variant="info">
                                            Signer
                                        </Badge>
                                        <Badge ui="dashkit" variant="destructive">
                                            Writable
                                        </Badge>
                                    </span>
                                }
                            />
                        )}
                    </OverviewValue>
                </OverviewRow>
            </Card>
        </section>
    );
}

// Mirrors the Summary card rows on the transaction details page (features/transaction/ui/SummaryCard):
// a label | value grid with 12px horizontal / 8px vertical padding and top-aligned content.
function OverviewRow({ children, divider }: { children: React.ReactNode; divider?: boolean }) {
    return (
        <div
            className={cn(
                'grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-start gap-2 px-3 py-2',
                divider && 'border-1 border-b border-white/10 [border-bottom-style:solid]',
            )}
        >
            {children}
        </div>
    );
}

function OverviewLabel({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-wrap items-center gap-1 text-sm text-outer-space-300">{children}</div>;
}

function OverviewValue({ children }: { children: React.ReactNode }) {
    return <div className="break-all text-sm text-white">{children}</div>;
}
