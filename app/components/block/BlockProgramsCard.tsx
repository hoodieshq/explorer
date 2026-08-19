import { Address } from '@components/common/Address';
import { TableCardBody } from '@components/common/TableCardBody';
import { cn } from '@components/shared/utils';
import { PublicKey, VersionedBlockResponse } from '@solana/web3.js';
import React from 'react';
import { HelpCircle } from 'react-feather';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';
import { invariant } from '@/app/shared/lib/invariant';
import { Card, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

// Design variant, switchable via prop (see BlockRewardsCard for the same pattern):
//   - 'default'     — the original Dashkit cards + table.
//   - 'collapsible' — the domains-card treatment (PR #115): each heading lifted out above a collapsible
//                     section, list on a `tight` card surface, CSS-grid body on `lg+` and a stacked,
//                     labelled layout below `lg`.
export type BlockProgramsVariant = 'default' | 'collapsible';

// Surface matched to the transaction tables (see BaseDomainsCard) — set on a `variant="tight"` Card.
// `!rounded-lg` (8px) forces the radius over the tw base's `rounded-xl` (12px) — see BlockHistoryCard.
const TIGHT_CARD = 'overflow-hidden !rounded-lg border-outer-space-800 bg-outer-space-900';

type ProgramStats = {
    ixFrequency: Map<string, number>;
    programEntries: [string, number][];
    showSuccessRate: boolean;
    totalInstructions: number;
    totalTransactions: number;
    txSuccesses: Map<string, number>;
};

// Aggregates program usage across a block's transactions. Unchanged from the original inline body —
// only lifted into a helper so both variants render from the same numbers.
function computeProgramStats(block: VersionedBlockResponse): ProgramStats {
    const totalTransactions = block.transactions.length;
    const txSuccesses = new Map<string, number>();
    const txFrequency = new Map<string, number>();
    const ixFrequency = new Map<string, number>();

    let totalInstructions = 0;
    block.transactions.forEach(tx => {
        const message = tx.transaction.message;
        totalInstructions += message.compiledInstructions.length;
        const programUsed = new Set<string>();
        const accountKeys = tx.transaction.message.getAccountKeys({
            accountKeysFromLookups: tx.meta?.loadedAddresses,
        });
        const trackProgram = (index: number) => {
            if (index >= accountKeys.length) return;
            const programId = accountKeys.get(index);
            invariant(programId, `account key index ${index} out of range`);
            const programAddress = programId.toBase58();
            programUsed.add(programAddress);
            const frequency = ixFrequency.get(programAddress);
            ixFrequency.set(programAddress, frequency ? frequency + 1 : 1);
        };

        message.compiledInstructions.forEach(ix => trackProgram(ix.programIdIndex));
        tx.meta?.innerInstructions?.forEach(inner => {
            totalInstructions += inner.instructions.length;
            inner.instructions.forEach(innerIx => trackProgram(innerIx.programIdIndex));
        });

        const successful = tx.meta?.err === null;
        programUsed.forEach(programId => {
            const frequency = txFrequency.get(programId);
            txFrequency.set(programId, frequency ? frequency + 1 : 1);
            if (successful) {
                const count = txSuccesses.get(programId);
                txSuccesses.set(programId, count ? count + 1 : 1);
            }
        });
    });

    const programEntries: [string, number][] = [];
    txFrequency.forEach((txFreq, programId) => {
        programEntries.push([programId, txFreq]);
    });

    programEntries.sort((a, b) => {
        if (a[1] < b[1]) return 1;
        if (a[1] > b[1]) return -1;
        return 0;
    });

    const showSuccessRate = block.transactions.every(tx => tx.meta !== null);
    return { ixFrequency, programEntries, showSuccessRate, totalInstructions, totalTransactions, txSuccesses };
}

export function BlockProgramsCard({
    block,
    variant = 'default',
}: {
    block: VersionedBlockResponse;
    variant?: BlockProgramsVariant;
}) {
    const stats = computeProgramStats(block);

    if (variant === 'collapsible') {
        // gap-6 (24px) between the two sections matches the spacing between instruction blocks on the
        // transaction page (each is a dashkit `CollapsibleCard` carrying the default `mb-6`).
        return (
            <div className="flex flex-col gap-6">
                <ProgramStatsCollapsible stats={stats} />
                <ProgramsCollapsible stats={stats} />
            </div>
        );
    }

    return <ProgramsDefault stats={stats} />;
}

// Original design — two Dashkit cards.
function ProgramsDefault({ stats }: { stats: ProgramStats }) {
    const { ixFrequency, programEntries, showSuccessRate, totalInstructions, totalTransactions, txSuccesses } = stats;
    return (
        <>
            <Card ui="dashkit">
                <CardHeader ui="dashkit">
                    <CardTitle as="h3" ui="dashkit">
                        Block Program Stats
                    </CardTitle>
                </CardHeader>
                <TableCardBody>
                    <BaseTable.Row>
                        <BaseTable.Cell className="w-full">Unique Programs Count</BaseTable.Cell>
                        <BaseTable.Cell className="text-right tabular-nums">{programEntries.length}</BaseTable.Cell>
                    </BaseTable.Row>
                    <BaseTable.Row>
                        <BaseTable.Cell className="w-full">Total Instructions</BaseTable.Cell>
                        <BaseTable.Cell className="text-right tabular-nums">{totalInstructions}</BaseTable.Cell>
                    </BaseTable.Row>
                </TableCardBody>
            </Card>
            <Card ui="dashkit">
                <CardHeader ui="dashkit">
                    <CardTitle as="h3" ui="dashkit">
                        Block Programs
                    </CardTitle>
                </CardHeader>
                <BaseTable ui="dashkit" variant="card" nowrap>
                    <BaseTable.Head>
                        <BaseTable.Row>
                            <BaseTable.HeaderCell className="text-dk-gray-700">Program</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">Transaction Count</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">% of Total</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">Instruction Count</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">% of Total</BaseTable.HeaderCell>
                            {showSuccessRate && (
                                <BaseTable.HeaderCell className="text-dk-gray-700">Success Rate</BaseTable.HeaderCell>
                            )}
                        </BaseTable.Row>
                    </BaseTable.Head>
                    <BaseTable.Body>
                        {programEntries.map(([programId, txFreq]) => {
                            const ixFreq = ixFrequency.get(programId) as number;
                            const successes = txSuccesses.get(programId) || 0;
                            return (
                                <BaseTable.Row key={programId}>
                                    <BaseTable.Cell>
                                        <Address pubkey={new PublicKey(programId)} link />
                                    </BaseTable.Cell>
                                    <BaseTable.Cell>{txFreq}</BaseTable.Cell>
                                    <BaseTable.Cell>{((100 * txFreq) / totalTransactions).toFixed(2)}%</BaseTable.Cell>
                                    <BaseTable.Cell>{ixFreq}</BaseTable.Cell>
                                    <BaseTable.Cell>{((100 * ixFreq) / totalInstructions).toFixed(2)}%</BaseTable.Cell>
                                    {showSuccessRate && (
                                        <BaseTable.Cell>{((100 * successes) / txFreq).toFixed(0)}%</BaseTable.Cell>
                                    )}
                                </BaseTable.Row>
                            );
                        })}
                    </BaseTable.Body>
                </BaseTable>
            </Card>
        </>
    );
}

// Domains-card style — "Block Program Stats" as label/value rows on a tight surface. Rows use the
// same grid key/value shape as BlockOverviewCard (fixed `clamp(100px,25%,200px)` label column, `1fr`
// mono value that wraps) so the block page's overview-style rows stay consistent.
function ProgramStatsCollapsible({ stats }: { stats: ProgramStats }) {
    const rows: [string, number][] = [
        ['Unique Programs', stats.programEntries.length],
        ['Total Instructions', stats.totalInstructions],
    ];
    return (
        <CollapsibleSection title="Block Program Stats" collapsible={false} className="">
            <Card variant="tight" className={TIGHT_CARD}>
                {rows.map(([label, value], i) => (
                    <div
                        key={label}
                        className={cn(
                            'grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2 px-3 py-2.5 md:px-4',
                            i < rows.length - 1 && 'border-1 border-b border-white/10 [border-bottom-style:solid]',
                        )}
                    >
                        <div className="flex flex-wrap items-center gap-1 overflow-hidden text-sm text-outer-space-300">
                            {label}
                        </div>
                        <div className="break-all text-sm text-white">{value}</div>
                    </div>
                ))}
            </Card>
        </CollapsibleSection>
    );
}

// Muted uppercase header cell + body cell, matching the transaction tables / BaseDomainsCard grid.
const GRID_HEADER_CELL = 'text-xs uppercase text-outer-space-300';

// Column header label; when `help` is set it carries a help icon and a hover explanation. The icon is
// inline (not a flex item) so a long label like "Transactions, % of total" wraps naturally and the icon
// trails the last word ("total") instead of being pushed onto its own line.
export function HeaderLabel({ label, help }: { label: string; help?: string }) {
    if (!help) {
        return <>{label}</>;
    }
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help">
                    {label}
                    <HelpCircle size={14} className="ml-1 inline align-text-bottom" />
                </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72 normal-case">{help}</TooltipContent>
        </Tooltip>
    );
}

// A single right-aligned mono figure (the Success column). `tabular-nums` keeps digits aligned across rows.
function MergedFigure({ count }: { count: string }) {
    return <div className="text-right tabular-nums">{count}</div>;
}

// A count with its percentage in parentheses on one right-aligned mono line: "count (percent)".
function BracketedFigure({ count, percent }: { count: string; percent: string }) {
    return (
        <div className="text-right tabular-nums">
            {count}
            <span className="text-outer-space-300"> ({percent})</span>
        </div>
    );
}

// Domains-card style: "Block Programs" as a CSS grid on lg+, stacked labelled rows below lg. Each figure
// shows its count with the percentage in parentheses ("count (percent)").
function ProgramsCollapsible({ stats }: { stats: ProgramStats }) {
    const { ixFrequency, programEntries, showSuccessRate, totalInstructions, totalTransactions, txSuccesses } = stats;

    // Program takes the slack; the count+percentage columns are a fixed 8.5rem track wide enough for a
    // "count (percent)" pair, while the single-value Success column is narrower (5rem). Fixed (not `auto`)
    // so the header and each row (separate grids) resolve identical track widths, keeping right edges
    // aligned. Inline (not a `grid-cols-[...]` class) so the Storybook JIT cannot purge it.
    const gridStyle: React.CSSProperties = {
        gridTemplateColumns: `minmax(0,1fr) 8.5rem 8.5rem${showSuccessRate ? ' 5rem' : ''}`,
    };
    const txPctHelp = `Share of the block's ${totalTransactions.toLocaleString('en-US')} processed transactions that invoked this program.`;
    const ixPctHelp = `Share of the block's ${totalInstructions.toLocaleString('en-US')} total instructions that invoked this program.`;
    const successHelp = "Share of this program's transactions that succeeded (no error).";
    const headers: { label: string; help?: string }[] = [
        { label: 'Program' },
        { help: txPctHelp, label: 'Transactions' },
        { help: ixPctHelp, label: 'Instructions' },
    ];
    if (showSuccessRate) headers.push({ help: successHelp, label: 'Success' });

    return (
        <CollapsibleSection title="Block Programs" collapsible={false} className="">
            <Card variant="tight" className={TIGHT_CARD}>
                <div className="text-sm text-white">
                    <div
                        style={gridStyle}
                        className={cn(
                            'hidden gap-5 px-3 py-2.5 md:grid md:px-4',
                            'border-b border-solid border-white/10',
                            GRID_HEADER_CELL,
                        )}
                    >
                        {headers.map((h, i) => (
                            <div key={i} className={cn(i > 0 && 'text-right')}>
                                <HeaderLabel help={h.help} label={h.label} />
                            </div>
                        ))}
                    </div>

                    {programEntries.map(([programId, txFreq]) => {
                        const ixFreq = ixFrequency.get(programId) as number;
                        const successes = txSuccesses.get(programId) || 0;
                        const txPct = `${((100 * txFreq) / totalTransactions).toFixed(2)}%`;
                        const ixPct = `${((100 * ixFreq) / totalInstructions).toFixed(2)}%`;
                        const successRate = showSuccessRate ? `${((100 * successes) / txFreq).toFixed(0)}%` : undefined;
                        const fields: { count: string; label: string; pct?: string }[] = [
                            { count: `${txFreq}`, label: 'Transactions', pct: txPct },
                            { count: `${ixFreq}`, label: 'Instructions', pct: ixPct },
                        ];
                        if (successRate !== undefined) {
                            fields.push({ count: successRate, label: 'Success' });
                        }
                        return (
                            <div key={programId} className="border-b border-solid border-white/10 last:border-b-0">
                                {/* Mobile / tablet: stacked, labelled rows. */}
                                <div className="flex flex-col gap-1 px-3 py-3 md:hidden">
                                    <div className="grid grid-cols-[clamp(100px,25%,200px)_1fr] items-center gap-2">
                                        <span className="text-outer-space-300">Program</span>
                                        <Address pubkey={new PublicKey(programId)} link />
                                    </div>
                                    {fields.map((f, i) => (
                                        <div
                                            key={i}
                                            className="grid grid-cols-[clamp(100px,25%,200px)_1fr] items-center gap-2"
                                        >
                                            <span className="text-outer-space-300">{f.label}</span>
                                            <span>
                                                {f.pct === undefined ? (
                                                    f.count
                                                ) : (
                                                    <>
                                                        {f.count}
                                                        <span className="text-outer-space-300">
                                                            {' '}
                                                            ({f.pct} of Total)
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop grid row. */}
                                <div style={gridStyle} className="hidden items-start gap-5 px-3 py-2.5 md:grid md:px-4">
                                    <div className="min-w-0">
                                        <Address pubkey={new PublicKey(programId)} link />
                                    </div>
                                    <BracketedFigure count={`${txFreq}`} percent={txPct} />
                                    <BracketedFigure count={`${ixFreq}`} percent={ixPct} />
                                    {successRate !== undefined && <MergedFigure count={successRate} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </CollapsibleSection>
    );
}
