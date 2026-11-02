import { Badge } from '@components/shared/ui/badge';
import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { cn } from '@components/shared/utils';
import { useScrollAnchor } from '@providers/scroll-anchor';
import type { SignatureResult } from '@solana/web3.js';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';
import React from 'react';

import { BaseTable } from '@/app/shared/ui/Table';

import { type InstructionPosition, positionLabel, positionNumbers } from '../model/node';

/** The chrome every instruction card shares, so a card with no instruction to show still matches its neighbours. */
export function InstructionCardFrame({
    title,
    result,
    position,
    collapsible = false,
    headerButtons,
    children,
}: {
    title: string;
    result: SignatureResult;
    position: InstructionPosition;
    collapsible?: boolean;
    headerButtons?: React.ReactNode;
    children: React.ReactNode;
}) {
    const badgeVariant = toBadgeVariant(result, position.index);
    const scrollAnchorRef = useScrollAnchor(getInstructionCardScrollAnchorId(positionNumbers(position)));
    return (
        <CollapsibleCard
            ref={scrollAnchorRef}
            collapsible={collapsible}
            title={
                <span className="flex min-w-0 flex-1 items-baseline">
                    <Badge ui="dashkit" variant={badgeVariant} className={cn('mr-1.5 flex-none', BADGE_OFFSET_CLASS)}>
                        #{positionLabel(position)}
                    </Badge>
                    <span className="min-w-0 flex-1">{title}</span>
                </span>
            }
            className={CARD_CLASS}
            headerButtons={headerButtons}
            headerClassName={HEADER_CLASS}
        >
            <CardTable>{children}</CardTable>
        </CollapsibleCard>
    );
}

export function CardTable({ children }: { children: React.ReactNode }) {
    return (
        <BaseTable ui="dashkit" variant="card" density="dense" nowrap className={TABLE_CLASS}>
            <BaseTable.Body>{children}</BaseTable.Body>
        </BaseTable>
    );
}

// Cards in a list sit 8px apart, like the mobile token cards. The last card keeps the card's 24px margin,
// so the space before the next section stays the same.
const CARD_CLASS = '[&:not(:last-child)]:mb-2';

// The header keeps the 12px padding of the cells on every side, so a wrapped title only makes it taller.
// Baselines line the title up with the Raw button. `cn` keeps conflicting classes, so `!` beats the header's own.
// An icon has no baseline, so a button would take the icon's bottom edge as its own. The label sets the baseline
// and the icon centres. The icon-only collapse button has no label, so it sits at the top instead.
const HEADER_CLASS =
    '!min-h-0 !items-baseline !p-3 [&_button]:items-baseline [&_button_svg]:self-center [&>button]:self-start';

// The badge text sits on the title baseline. With its even padding the text looks high in the pill, so the
// padding moves 1.5px from bottom to top: the pill rises and the text stays put. `!` beats the badge's own padding.
const BADGE_OFFSET_CLASS = '!pt-[calc(0.33em_+_1.5px)] !pb-[calc(0.33em_-_1.5px)]';

// Every cell has 12px padding on every side. `!` beats the 10px vertical padding of `density="dense"`.
// Cells align on the baseline of their first line, so a value inside a padded block (hex, JSON) lines up with its name.
// Names and values wrap, so a long name or string does not widen the card past its frame.
// The name column takes a share of the row, so it widens with the card: 35% below md (about 120px on a 375px
// screen), 25% from md and 30% from xxl, where the instructions share the row with the logs. Plain percentages,
// because a table cell treats a calc() width with a percentage as auto. The last column takes the rest of the
// row, so no spare width reaches the name column, and the Type column shrinks to its content.
// A name breaks only a word wider than its mobile cap, so a short word never splits to make room for a value.
// A full-width cell holds nested cards, so it only wraps and their titles keep whole words.
const TABLE_CLASS = cn(
    '[&>tbody>tr:first-child>td]:!border-t-0',
    '[&_tbody_tr_td]:!py-3 [&_tbody_tr_td]:!align-baseline',
    '[&_td:first-child:not(:last-child)]:whitespace-normal [&_td:first-child:not(:last-child)]:break-words [&_td:first-child:not(:last-child)]:text-balance max-md:[&_td:first-child:not(:last-child)]:max-w-[40vw]',
    'max-md:[&_td:first-child:not(:last-child)]:w-[35%] md:[&_td:first-child:not(:last-child)]:w-1/4 xxl:[&_td:first-child:not(:last-child)]:w-[30%]',
    '[&_td:last-child]:w-full',
    // Names take the muted colour of the Summary labels. A section row sets its own colour on the row, so it is skipped.
    '[&_tbody_tr:not(.bg-dark-background)>td:first-child:not(:last-child)]:text-outer-space-300',
    '[&_td:last-child:not(:first-child)]:whitespace-normal [&_td:last-child:not(:first-child)]:[overflow-wrap:anywhere]',
    '[&_td:only-child]:whitespace-normal',
);

function toBadgeVariant(result: SignatureResult, index: number): 'success' | 'warning' | 'dark' {
    if (result.err) {
        const ixError =
            typeof result.err === 'object' && 'InstructionError' in result.err
                ? result.err.InstructionError
                : undefined;
        if (ixError && Array.isArray(ixError)) {
            const [errorIndex] = ixError;
            if (Number.isInteger(errorIndex) && errorIndex === index) {
                return 'warning';
            }
        }
        return 'dark';
    }
    return 'success';
}
