import { TruncatedValue } from '@components/shared/TruncatedValue';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cn } from '@components/shared/utils';
import { RecentBlockhashesEntry, RecentBlockhashesInfo } from '@validators/accounts/sysvar';
import React from 'react';

import { Card, CardFooter, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

export type BlockhashesLayout = 'table' | 'grid';

// Column labels for the grid layout: the `md`+ header row and the mobile field labels read from here.
const COLUMNS = ['Recency', 'Blockhash', 'Fee Calculator'] as const;

export function BlockhashesCard({
    blockhashes,
    layout = 'table',
}: {
    blockhashes: RecentBlockhashesInfo;
    layout?: BlockhashesLayout;
}) {
    if (layout === 'grid') {
        // Heading lifted out above the card via CollapsibleSection, same as the Rewards and Vote History
        // cards (`className=""` so the surface comes from the `<Card>` below).
        return (
            <CollapsibleSection title="Blockhashes" className="">
                <Card variant="tight" className="!rounded-lg border-outer-space-800 bg-outer-space-900">
                    {blockhashes.length > 0 ? (
                        <BlockhashesGrid blockhashes={blockhashes} />
                    ) : (
                        <div className="px-3 py-3 text-center text-sm text-outer-space-300">No blockhashes found</div>
                    )}
                </Card>
            </CollapsibleSection>
        );
    }

    return <BlockhashesTable blockhashes={blockhashes} />;
}

// `<table>` layout: the original dashkit card.
function BlockhashesTable({ blockhashes }: { blockhashes: RecentBlockhashesInfo }) {
    return (
        <>
            <Card ui="dashkit">
                <CardHeader ui="dashkit">
                    <CardTitle as="h3" ui="dashkit">
                        Blockhashes
                    </CardTitle>
                </CardHeader>
                <BaseTable ui="dashkit" variant="card" nowrap>
                    <BaseTable.Head>
                        <BaseTable.Row>
                            <BaseTable.HeaderCell className="w-px text-dk-gray-700">Recency</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="w-px text-dk-gray-700">Blockhash</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="text-dk-gray-700">Fee Calculator</BaseTable.HeaderCell>
                        </BaseTable.Row>
                    </BaseTable.Head>
                    <BaseTable.Body>
                        {blockhashes.length > 0 &&
                            blockhashes.map((entry: RecentBlockhashesEntry, index) => {
                                return renderAccountRow(entry, index);
                            })}
                    </BaseTable.Body>
                </BaseTable>

                <CardFooter ui="dashkit">
                    <div className="text-center text-dk-gray-700">
                        {blockhashes.length > 0 ? '' : 'No blockhashes found'}
                    </div>
                </CardFooter>
            </Card>
        </>
    );
}

const renderAccountRow = (entry: RecentBlockhashesEntry, index: number) => {
    return (
        <BaseTable.Row key={index}>
            <BaseTable.Cell className="w-px">{index + 1}</BaseTable.Cell>
            <BaseTable.Cell className="w-px font-mono">{entry.blockhash}</BaseTable.Cell>
            <BaseTable.Cell className="">
                {entry.feeCalculator.lamportsPerSignature} lamports per signature
            </BaseTable.Cell>
        </BaseTable.Row>
    );
};

// The header row and every data row are separate grids, so the tracks are sized explicitly rather than
// `auto` to keep the columns aligned; percentages resolve against the same width in each, so they line up.
//
// The three columns grow in proportion to their base widths, 3.5 : 26 : 13 (rem). Recency starts just
// wider than its 55px header label, the blockhash at the width that holds the hash on one line, and Fee
// Calculator at what "10000 lamports per signature" needs. Blockhash and Fee are `fr` tracks with those
// weights. Recency can't be an `fr` track because its growth stops at about 1.6x (5.6rem), so it takes the
// same proportional share explicitly, `(100% - 2.5rem gaps) * 3.5 / 42.5`, clamped to 3.5rem..5.6rem;
// once it hits the cap, the other two split the rest 2 : 1. Fee keeps a 13rem floor, and the blockhash's
// `0` minimum lets it shrink and wrap instead of widening the card.
const GRID_TEMPLATE =
    'grid-cols-[clamp(3.5rem,calc((100%_-_2.5rem)*3.5/42.5),5.6rem)_minmax(0,26fr)_minmax(13rem,13fr)] gap-5';

// The cell around a blockhash, the same as the Slot Hashes card's hash column. The full blockhash wraps
// (`break-all`) instead of being truncated in the middle: a blockhash has no page to link to, so the
// visible text is the only place to read it. It sits on one line once its column is about 25rem wide and
// wraps onto two or three lines below that. `min-w-0` lets the cell shrink below the hash's width.
const HASH_CELL = 'min-w-0 break-all';

// Same rendering as the transaction Summary signature: the copy icon keeps its own column and the wrapped
// hash lines stay aligned beside it.
function BlockhashValue({ blockhash }: { blockhash: string }) {
    return <TruncatedValue value={blockhash} truncation={{ enabled: false }} alignItems="start" />;
}

// Grid layout, responsive like the Rewards card: an `md`+ grid (header row + data rows) and, below `md`,
// each row stacks into labelled fields. The switch is at `md`, not Rewards' `sm`, because between the two
// the blockhash column is too narrow for the hash and it wraps.
function BlockhashesGrid({ blockhashes }: { blockhashes: RecentBlockhashesInfo }) {
    return (
        <div className="text-sm text-white">
            <div
                className={cn(
                    'border-1 hidden border-b border-white/10 px-3 py-2.5 text-xs uppercase text-outer-space-300 [border-bottom-style:solid] md:grid',
                    GRID_TEMPLATE,
                )}
            >
                {COLUMNS.map(label => (
                    <div key={label}>{label}</div>
                ))}
            </div>
            {blockhashes.map((entry, index) => (
                <BlockhashRow key={entry.blockhash} entry={entry} recency={index + 1} />
            ))}
        </div>
    );
}

// `items-start` and a shrinkable value column so a wrapped blockhash or fee line stays inside the row and
// the label stays on its first line.
//
// The value column has priority over the label. The label follows the KeyValue label band
// (`clamp(min, 20%, 240px)`) with a 6rem floor (fits "Fee Calculator"), but its middle term is also capped
// at `100% - 26.5rem`: the width left once the value column can hold the hash on one line (26rem, i.e. the
// copy glyph plus 44 mono characters, about 400px, with room for font and zoom rounding) and the 0.5rem
// gap is taken. Until the hash fits, that term is below the floor and the label stays at 6rem; after
// that, the label grows towards its KeyValue band. Every field is its own flex row of the same width, so
// the labels stay aligned.
function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <span className="w-[clamp(6rem,min(20%,100%_-_26.5rem),240px)] shrink-0 text-outer-space-300">{label}</span>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

function BlockhashRow({ entry, recency }: { entry: RecentBlockhashesEntry; recency: number }) {
    const fee = `${entry.feeCalculator.lamportsPerSignature} lamports per signature`;

    return (
        <div className="border-1 border-b border-white/10 [border-bottom-style:solid] last:border-b-0">
            {/* Below md: stacked, labelled fields. */}
            <div className="flex flex-col gap-1 px-3 py-3 md:hidden">
                <MobileField label={COLUMNS[0]}>{recency}</MobileField>
                <MobileField label={COLUMNS[1]}>
                    <div className={HASH_CELL}>
                        <BlockhashValue blockhash={entry.blockhash} />
                    </div>
                </MobileField>
                <MobileField label={COLUMNS[2]}>{fee}</MobileField>
            </div>
            {/* md+: grid row aligned to the header. */}
            <div className={cn('hidden min-h-9 items-start px-3 py-2.5 md:grid', GRID_TEMPLATE)}>
                <div>{recency}</div>
                <div className={HASH_CELL}>
                    <BlockhashValue blockhash={entry.blockhash} />
                </div>
                <div>{fee}</div>
            </div>
        </div>
    );
}
