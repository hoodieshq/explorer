import { KitAddress } from '@components/common/KitAddress';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { Timestamp } from '@components/shared/ui/timestamp';
import { isAddress } from '@solana/kit';
import { cva } from 'class-variance-authority';

import { Card } from '@/app/shared/ui/Card';

import type { NftokenTrait } from '../lib/nftoken-metadata';

// The Metaplex NFT attributes table from HOO-921, which isn't merged yet; fold the two into one once it is. NFToken
// metadata calls them traits; the tab and the table say Attributes, as on a Metaplex NFT.

const GRID_COLUMNS = ['Trait type', 'Value'] as const;

export function BaseNftokenAttributes({ traits }: { traits: NftokenTrait[] }) {
    return (
        <CollapsibleSection title="Attributes" className="">
            {/* Same surface as the Slot Hashes and Vote History grid cards. `!` because `cn` has no
                tailwind-merge, and the tw card's own `rounded-xl` would otherwise win. */}
            <Card variant="tight" className="!rounded-lg border-outer-space-800 bg-outer-space-900">
                <AttributesGrid traits={traits} />
            </Card>
        </CollapsibleSection>
    );
}

// `gridCellVariants` owns all grid cell styling. `role` picks header vs body chrome; header cells leave
// `column` at its default.
const gridCellVariants = cva('flex px-3 py-2.5', {
    defaultVariants: { column: 'none', role: 'body' },
    variants: {
        column: {
            // Both columns hold free text from the metadata JSON, and either can be long. They wrap
            // instead of truncating, so the page never scrolls sideways on a phone; `min-w-0` lets the
            // `1fr` track shrink below an unbroken value's width.
            none: '',
            text: 'min-w-0 break-words',
        },
        // `body`: top-aligned so the trait type lines up with the first line of a wrapped value.
        role: {
            body: 'items-start border-t border-solid border-outer-space-800',
            header: 'items-center whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});

// The Slot Hashes grid's tracks, so the tables line up: Trait type takes the `clamp(132px,25%,200px)` band, Value
// the rest.
function AttributesGrid({ traits }: { traits: NftokenTrait[] }) {
    return (
        <div className="w-full text-sm text-white">
            {/* `contents` row wrappers generate no box, so the cells stay direct grid items: ARIA rows for
                screen readers without breaking the column alignment. */}
            <div role="table" aria-label="Attributes" className="grid grid-cols-[clamp(132px,25%,200px)_1fr]">
                <div role="row" className="contents">
                    {GRID_COLUMNS.map(label => (
                        <div key={label} role="columnheader" className={gridCellVariants({ role: 'header' })}>
                            {label}
                        </div>
                    ))}
                </div>
                {traits.length > 0 ? (
                    // An index key: nothing stops the metadata from listing the same trait twice.
                    traits.map(({ type, value }, index) => (
                        <div key={index} role="row" className="contents">
                            <div role="cell" className={gridCellVariants({ column: 'text' })}>
                                {type}
                            </div>
                            <div role="cell" className={gridCellVariants({ column: 'text' })}>
                                <TraitValue value={value} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div role="row" className="contents">
                        <div
                            role="cell"
                            className="col-span-2 border-t border-solid border-outer-space-800 px-3 py-2.5 text-center text-outer-space-300"
                        >
                            No attributes
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * A trait value the way the rest of the Explorer shows its kind: an address with the address component (link, copy,
 * name), a date with the timestamp and its format dropdown, anything else as the text it is.
 */
function TraitValue({ value }: { value: string }) {
    if (isAddress(value)) {
        // `w-full`: the cell is a flex row, so without it the wrapper shrinks to the shortened text, and the address
        // component, which shortens the address when it is wider than its box, keeps it shortened however much room
        // the cell has. `overflow-hidden`: the component measures its full text in a hidden span, which would
        // otherwise widen the page on a phone.
        return (
            <div className="w-full min-w-0 overflow-hidden">
                <KitAddress address={value} link />
            </div>
        );
    }

    const timestamp = isoTimestamp(value);
    if (timestamp !== undefined) return <Timestamp unixTimestamp={timestamp} />;

    return value;
}

// Only a full ISO 8601 UTC timestamp, as `toISOString` writes it ("2022-07-09T21:48:18.722Z"), counts as a date:
// `Date` also parses "3" or "2022", which are plain values in a trait list. Returns Unix seconds, what `Timestamp`
// takes; the milliseconds are dropped, as no format it offers shows them.
function isoTimestamp(value: string): number | undefined {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return undefined;
    return new Date(ms).toISOString() === value ? Math.floor(ms / 1000) : undefined;
}
