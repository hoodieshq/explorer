import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { BorshAccountsCoder, Idl } from '@coral-xyz/anchor';
import { IdlTypeDef } from '@coral-xyz/anchor/dist/cjs/idl';
import { getAnchorIdls, getAnchorIdlsWithAccounts, useAnchorProgram, useProgramIdls } from '@entities/idl';
import { FieldValueView, type InstructionArg } from '@entities/instruction-card';
import { Account } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { anchorAccountArgs, getAnchorProgramName } from '@utils/anchor';
import { cva } from 'class-variance-authority';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, CornerDownRight } from 'react-feather';

import { equals, toBuffer } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { Card } from '@/app/shared/ui/Card';

export function AnchorAccountCard({ account }: { account: Account }) {
    const { lamports } = account;
    const { url, cluster } = useCluster();
    const { idls } = useProgramIdls(account.owner.toString(), url, cluster);
    const { program: anchorProgram } = useAnchorProgram({
        cluster,
        programAddress: account.owner.toString(),
        select: getAnchorIdlsWithAccounts,
        url,
    });
    const rawData = account.data.raw;
    const idl: Idl | undefined = anchorProgram?.idl;
    const programName = getAnchorProgramName(anchorProgram) || 'Unknown Program';

    const { decodedAccountData, accountDef } = useMemo(() => {
        let decodedAccountData: any | null = null;
        let accountDef: IdlTypeDef | undefined = undefined;
        if (idl && rawData) {
            try {
                const coder = new BorshAccountsCoder(idl);
                const account = idl.accounts?.find((accountType: any) =>
                    equals(rawData.slice(0, 8), coder.accountDiscriminator(accountType.name)),
                );
                if (account) {
                    accountDef = idl.types?.find((type: any) => type.name === account.name);
                    try {
                        decodedAccountData = coder.decode(account.name, toBuffer(rawData));
                    } catch (err) {
                        Logger.debug('[components:anchor-account] Failed to decode account data', { error: err });
                    }
                }
            } catch (err) {
                Logger.debug('[components:anchor-account] Failed to build accounts coder', { error: err });
            }
        }

        return {
            accountDef,
            decodedAccountData,
        };
    }, [idl, rawData]);

    if (lamports === undefined) return null;
    if (!idls) return <LoadingCard message="Loading program IDL" />;
    if (getAnchorIdls(idls).length === 0) return <ErrorCard text="No Anchor IDL found" />;
    if (!idl || !decodedAccountData || !accountDef) {
        return <ErrorCard text="Failed to decode account data according to the public Anchor interface" />;
    }

    const accountName = accountDef.name.charAt(0).toUpperCase() + accountDef.name.slice(1);

    return (
        // The heading sits above the frame and the frame comes from the `Card` below, as in the Domains tab,
        // so `CollapsibleSection` gets an empty `className`. `pb-10` is the room under the page's last block that
        // the transaction page leaves under its instructions.
        <CollapsibleSection title={`${programName}: ${accountName}`} className="" sectionClassName="pb-10">
            {/* Surface matched to the Domains card: bg `outer-space-900` equals `#1e2423` (dashkit
                `dk-gray-800-dark`), `border-outer-space-800` gives the frame the tone of the row lines,
                `rounded-lg` is the 8px radius. BaseCard merges classes with tailwind-merge, so these replace
                the tw variant's defaults. */}
            <Card variant="tight" className="overflow-hidden rounded-lg border-outer-space-800 bg-outer-space-900">
                <AccountFieldsGrid
                    label={`${accountName} fields`}
                    args={anchorAccountArgs(decodedAccountData, accountDef as IdlTypeDef, idl)}
                />
            </Card>
        </CollapsibleSection>
    );
}

// Column labels, kept in one place so header copy can't drift from the rows below.
const COLUMNS = ['Field', 'Type', 'Value'] as const;

// A CSS grid built from `div`s, like the Domains list, with ARIA table roles so assistive tech keeps the
// table / row / cell relationships. Row wrappers use `contents`, so their cells stay items of this one grid
// and every row shares the same columns.
//
// Columns:
// - Below md: name and value. The name column grows with the names up to `clamp(200px,50%,400px)` and the
//   name cell's `min-w` floor keeps it at least `clamp(120px,25%,240px)`, as in Domains; the type moves
//   under the name. Unlike Domains, the value column never gets narrower than 160px, a mid-truncated address
//   with its copy and nickname buttons plus the cell padding, so the name column grows only into the room
//   left over: on a 320px phone it stays at its floor and the address keeps one line.
// - sm to md: still name and value, now a fixed 60% / 40%; 40% of a 577px screen already holds the address.
// - md and up: name / type / value at 50% / 25% / 25%. `minmax(0, …)` keeps the split whatever the content.
function AccountFieldsGrid({ label, args }: { label: string; args: readonly InstructionArg[] }) {
    return (
        <div className="w-full overflow-x-auto text-sm text-white">
            <div
                role="table"
                aria-label={label}
                className="grid min-w-full grid-cols-[fit-content(clamp(200px,50%,400px))_minmax(160px,1fr)] sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
            >
                <div role="row" className="contents">
                    {COLUMNS.map(column => (
                        <div
                            key={column}
                            role="columnheader"
                            className={gridCellVariants({
                                column: column === 'Type' ? 'type' : 'none',
                                role: 'header',
                            })}
                        >
                            {column}
                        </div>
                    ))}
                </div>
                <FieldRows args={args} depth={0} />
            </div>
        </div>
    );
}

function FieldRows({ args, depth }: { args: readonly InstructionArg[]; depth: number }) {
    return (
        <>
            {args.map(arg => (
                <FieldRow key={arg.name} arg={arg} depth={depth} />
            ))}
        </>
    );
}

function FieldRow({ arg, depth }: { arg: InstructionArg; depth: number }) {
    const [expanded, setExpanded] = useState(false);
    const nested = depth > 0;

    return (
        <>
            <div role="row" className="contents">
                <div role="cell" className={gridCellVariants({ column: 'name', nested })}>
                    <FieldName name={arg.name} type={arg.type} depth={depth} />
                </div>
                <div role="cell" className={gridCellVariants({ column: 'type', nested })}>
                    {arg.type}
                </div>
                <div role="cell" className={gridCellVariants({ column: 'value', nested })}>
                    {arg.kind === 'leaf' && <FieldValueView value={arg.value} />}
                    {arg.kind === 'group' && (
                        // The colour is the instruction cards' Expand toggle (dashkit `dk-info`), written as its
                        // value so the page holds no dashkit token.
                        <button
                            type="button"
                            aria-expanded={expanded}
                            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-0 bg-transparent p-0 text-[#43b5c5]"
                            onClick={() => setExpanded(current => !current)}
                        >
                            {expanded ? 'Collapse' : 'Expand'}
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                    )}
                </div>
            </div>
            {arg.kind === 'group' && expanded && <FieldRows args={arg.children} depth={depth + 1} />}
        </>
    );
}

// Only the deepest level draws the arrow; each level above it leaves a blank of the arrow's width, the same
// rule as the instruction cards' `FieldNameCell`. Below md the type sits under the name; from md it has its
// own column.
function FieldName({ name, type, depth }: { name: string; type: string; depth: number }) {
    return (
        <div className="flex min-w-0 flex-row items-baseline">
            {/* The blanks are identical, so the level is the key. */}
            {Array.from({ length: Math.max(depth - 1, 0) }, (_, level) => (
                <span key={level} aria-hidden data-nesting-indent="" className="mr-1.5 w-3.5 flex-none" />
            ))}
            {depth > 0 && (
                // One line tall, so the arrow stays on the name's line when the type adds a second one.
                <span aria-hidden className="mr-1.5 flex h-[1lh] flex-none items-center self-start">
                    <CornerDownRight size={14} />
                </span>
            )}
            <div className="min-w-0">
                <div>{name}</div>
                <div className="italic text-outer-space-300 md:hidden">{type}</div>
            </div>
        </div>
    );
}

// `gridCellVariants` owns all cell styling, after the Domains grid. `role` picks header vs body chrome;
// `column` picks the per-column concerns; `nested` tints the rows of an expanded group.
const gridCellVariants = cva('flex px-3 py-2.5', {
    compoundVariants: [{ class: 'italic text-outer-space-300 [overflow-wrap:anywhere]', column: 'type', role: 'body' }],
    defaultVariants: { column: 'none', nested: false, role: 'body' },
    variants: {
        // `name` keeps the Domains floor below sm and wraps a long name; `type` exists from md only (below md
        // it sits under the name) and is italic in the muted label colour; `value` may shrink and wraps.
        column: {
            name: 'min-w-[clamp(120px,25%,240px)] [overflow-wrap:anywhere] sm:min-w-0',
            none: '',
            type: 'hidden min-w-0 md:flex',
            value: 'min-w-0 [overflow-wrap:anywhere]',
        },
        nested: { false: '', true: 'bg-black/20' },
        // Header vs body chrome. `header`: muted uppercase `text-xs` labels on one line. `body`: an
        // `outer-space-800` top border (the tone of the card border) as the row line, top-aligned.
        role: {
            body: 'items-start border-t border-solid border-outer-space-800',
            header: 'items-center whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});
