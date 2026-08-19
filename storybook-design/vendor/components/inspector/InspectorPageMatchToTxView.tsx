'use client';

// Independent composition root for the "Match to TX view" tx-inspector page. It re-implements the
// signature (permalink) path of InspectorPage and is arranged to MATCH THE TRANSACTION DETAILS PAGE
// (app/tx/[signature]/page-client.tsx) in structure and block layout:
//   Overview (= Summary)  →  scroll-spy tab bar  →  full-width stack (Signatures, Accounts, Address
//   Lookups, SOL Balance Changes = Tokens)  →  a full-bleed two-column "Programs & Logs" row at xxl:
//   Instructions (Programs) on the left, and the Simulation control + Logs + CU profiling in the
//   sticky right column.
// The simulation is deliberately moved into the right column so it lives TOGETHER with the logs it
// produces — mirroring the TX page's ProgramLogSection + CUProfilingSection sticky panel.
// Everything Default and Enhancements render is untouched: the simulation zone pieces used here come
// from a private `*.match-to-tx-view` module, not the shared SimulationSections.
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
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';
import { Card } from '@/app/shared/ui/Card';
import { useClusterPath } from '@/app/utils/url';

import { SimulationLogsPanel } from '../../features/instruction-simulation/ui/SimulationLogsPanel.match-to-tx-view';
// Vendored BaseNavigationTabs (adds `disabled` tab support) — the app original can't render the
// disabled Logs / CU profiling tabs shown before a simulation runs.
import { BaseNavigationTabs } from '../../shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { PageContainer } from '../../shared/ui/page-container/PageContainer';
// Merged Account List (SOL Balance Changes folded in as a "Change" column) — a Match-to-TX-view fork.
import { AccountsCard } from './AccountsCard.match-to-tx-view';
import { AddressTableLookupsCard } from './AddressTableLookupsCard';
import { AddressWithContext, createFeePayerValidator } from './AddressWithContext';
import type { TransactionData } from './InspectorPage';
import { InstructionsSection } from './InstructionsSection';
import { TransactionSignatures } from './SignaturesCard';

export function TransactionInspectorPageMatchToTxView({
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

// Tab bar sections. `path` doubles as the anchor id on the matching section wrapper, so scroll-spy can
// track it and clicking scrolls to it. `gated` tabs (the simulation-derived Logs / CU profiling) are
// shown disabled until a simulation has run. `merged` tabs collapse into the single "Programs & Logs"
// tab on the xxl two-column layout (mirrors the TX details page, which merges its Programs and Logs
// tabs when they sit side by side). SOL Balance Changes has no tab of its own — it is merged into the
// Accounts table as a "Change" column.
const BASE_TABS: {
    path: string;
    title: string;
    gated?: boolean;
    merged?: boolean;
    requiresSignatures?: boolean;
}[] = [
    { path: 'signatures', requiresSignatures: true, title: 'Signatures' },
    { path: 'accounts', title: 'Accounts' },
    { merged: true, path: 'programs', title: 'Programs' },
    { merged: true, path: 'simulation', title: 'Simulation' },
    { gated: true, merged: true, path: 'logs', title: 'Logs' },
    { gated: true, merged: true, path: 'cu-profiling', title: 'CU profiling' },
];

function LoadedView({
    transaction,
    onClear,
    showTokenBalanceChanges: _showTokenBalanceChanges,
}: {
    transaction: TransactionData;
    onClear: () => void;
    showTokenBalanceChanges: boolean;
}) {
    const { message, rawMessage, signatures, accountBalances, compiledInnerInstructions } = transaction;
    const { isXxl } = useBreakpoint();

    const fetchAccountInfo = useFetchAccountInfo();
    React.useEffect(() => {
        for (const lookup of message.addressTableLookups) {
            fetchAccountInfo(lookup.accountKey, 'parsed');
        }
    }, [message, fetchAccountInfo]);

    // Simulation state is owned here (not inside a section) so the tab bar can gate the
    // simulation-derived tabs until it resolves, and the panels can render off the same state.
    const simulation = useSimulation(message, accountBalances);
    const simDone = simulation.status === 'done';

    const hasSignatures = Boolean(signatures);
    // Build the tab list. On xxl the Programs / Simulation / Logs / CU profiling tabs sit in the
    // side-by-side row, so they collapse into a single "Programs & Logs" tab (the `programs` anchor)
    // and the rest are dropped — exactly how the TX page merges Programs & Logs when side by side.
    const tabs = React.useMemo(() => {
        const visible = BASE_TABS.filter(t => !(t.requiresSignatures && !hasSignatures));
        const forXxl = visible
            .filter(t => !(t.merged && t.path !== 'programs'))
            .map(t => (t.path === 'programs' ? { ...t, title: 'Programs & Logs' } : t));
        return (isXxl ? forXxl : visible).map(t => ({
            disabled: Boolean(t.gated) && !simDone,
            path: t.path,
            title: t.title,
        }));
    }, [hasSignatures, isXxl, simDone]);

    // Overview stays above the tab bar; the scroll-spy tab bar (same styling as the TX page) navigates
    // the sections below it. Block spacing mirrors the transaction details page.
    return (
        <>
            <OverviewCard message={message} raw={rawMessage} onClear={onClear} />
            <BaseNavigationTabs
                scrollSpy
                tabs={tabs}
                buildHref={path => `#${path}`}
                wrapperClassName="mt-3 bg-heavy-metal-900 lg:mt-0"
                className="gap-5"
                disabledHint="Run the simulation to load this tab's content."
            />
            <div className="mt-9 flex flex-col space-y-9 lg:mt-12 lg:space-y-12">
                {signatures && (
                    <div id="signatures">
                        <TransactionSignatures message={message} signatures={signatures} rawMessage={rawMessage} />
                    </div>
                )}
                {/* Account List with the SOL Balance Changes merged in as a "Change" column; the
                    per-row Simulate affordance drives the same simulation the panel below uses. */}
                <div id="accounts">
                    <AccountsCard message={message} simulation={simulation} />
                </div>
                <div id="address-lookups">
                    <AddressTableLookupsCard message={message} />
                </div>
                {/* Programs & Logs — the two-column row copied from the TX details page. At xxl it goes
                    full-bleed to the viewport: Instructions (Programs) on the left, and the Simulation
                    control + Logs + CU profiling in the sticky right column. */}
                <div className="flex flex-col space-y-9 pb-10 xxl:relative xxl:left-1/2 xxl:w-screen xxl:-translate-x-1/2 xxl:flex-row xxl:items-start xxl:gap-6 xxl:space-y-0 xxl:px-6">
                    <div id="programs" className="xxl:min-w-0 xxl:flex-[1_1_0%] xxl:overflow-hidden">
                        <InstructionsSection message={message} compiledInnerInstructions={compiledInnerInstructions} />
                    </div>
                    <div className="scrollbar-hide xxl:sticky xxl:top-[70px] xxl:max-h-[calc(100vh-90px)] xxl:min-w-0 xxl:flex-[1_1_0%] xxl:overflow-y-auto xxl:rounded-b-lg">
                        <SimulationLogsPanel simulation={simulation} message={message} />
                    </div>
                </div>
            </div>
        </>
    );
}

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
        <section id="summary" className="flex flex-col gap-3">
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
// a label | value grid with 12px horizontal / 10px vertical padding and top-aligned content.
function OverviewRow({ children, divider }: { children: React.ReactNode; divider?: boolean }) {
    return (
        <div
            className={cn(
                'grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-start gap-2 px-3 py-2.5',
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
