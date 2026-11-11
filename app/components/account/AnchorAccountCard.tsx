import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { cn } from '@components/shared/utils';
import { BorshAccountsCoder, Idl } from '@coral-xyz/anchor';
import { IdlTypeDef } from '@coral-xyz/anchor/dist/cjs/idl';
import { getAnchorIdls, getAnchorIdlsWithAccounts, useAnchorProgram, useProgramIdls } from '@entities/idl';
import { FieldValueView, type InstructionArg } from '@entities/instruction-card';
import { Account } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { anchorAccountArgs, getAnchorProgramName } from '@utils/anchor';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, CornerDownRight } from 'react-feather';

import { equals, toBuffer } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { cellVariants, GridTableFrame } from '@/app/shared/ui/grid-table';

// Field keeps a floor below sm and wraps a long name; Type is italic/muted and only exists from md (below
// md it sits under the name); Value may shrink and wraps. A nested row is tinted.
const NAME_CELL = 'min-w-[clamp(120px,25%,240px)] [overflow-wrap:anywhere] sm:min-w-0';
const TYPE_CELL = 'hidden min-w-0 italic text-outer-space-300 [overflow-wrap:anywhere] md:flex';
const VALUE_CELL = 'min-w-0 [overflow-wrap:anywhere]';
const NESTED = 'bg-black/20';

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
        // `overflow-hidden` clips the nested rows' tint to the card's rounded corners.
        <GridTableFrame title={`${programName}: ${accountName}`} cardClassName="overflow-hidden">
            <div className="w-full overflow-x-auto text-sm text-white">
                {/* Name and value share two columns below md (Type moves under the name); from md Type gets its
                    own column, at 50 / 25 / 25. */}
                <div
                    role="table"
                    aria-label={`${accountName} fields`}
                    className="grid min-w-full grid-cols-[fit-content(clamp(200px,50%,400px))_minmax(160px,1fr)] sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
                >
                    <div role="row" className="contents">
                        <div role="columnheader" className={cellVariants({ role: 'header' })}>
                            Field
                        </div>
                        <div
                            role="columnheader"
                            className={cn(cellVariants({ role: 'header' }), 'hidden min-w-0 md:flex')}
                        >
                            Type
                        </div>
                        <div role="columnheader" className={cellVariants({ role: 'header' })}>
                            Value
                        </div>
                    </div>
                    <FieldRows args={anchorAccountArgs(decodedAccountData, accountDef as IdlTypeDef, idl)} depth={0} />
                </div>
            </div>
        </GridTableFrame>
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
                <div role="cell" className={cn(cellVariants(), NAME_CELL, nested && NESTED)}>
                    <FieldName name={arg.name} type={arg.type} depth={depth} />
                </div>
                <div role="cell" className={cn(cellVariants(), TYPE_CELL, nested && NESTED)}>
                    {arg.type}
                </div>
                <div role="cell" className={cn(cellVariants(), VALUE_CELL, nested && NESTED)}>
                    {arg.kind === 'leaf' && <FieldValueView value={arg.value} />}
                    {arg.kind === 'group' && (
                        // `#43b5c5` is the instruction cards' Expand toggle (dashkit `dk-info`) as a literal,
                        // so this page holds no dashkit token.
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

// The deepest level draws the arrow; each level above leaves a blank of its width, as the instruction
// cards' `FieldNameCell` does. Below md the type sits under the name; from md it has its own column.
function FieldName({ name, type, depth }: { name: string; type: string; depth: number }) {
    return (
        <div className="flex min-w-0 flex-row items-baseline">
            {Array.from({ length: Math.max(depth - 1, 0) }, (_, level) => (
                <span key={level} aria-hidden data-nesting-indent="" className="mr-1.5 w-3.5 flex-none" />
            ))}
            {depth > 0 && (
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
