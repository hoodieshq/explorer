import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { cn } from '@components/shared/utils';
import { ProgramField } from '@entities/instruction-card';
// Reached by module path, not the feature barrel: the barrel pulls in IdlInstructionCard, which
// renders this card, and the resulting import cycle is a bundler hazard for no gain.
import { useInstructionIntentSlots } from '@features/decode-instruction-with-idl/ui/InstructionIntent';
import { useScrollAnchor } from '@providers/scroll-anchor';
import { ParsedInstruction, SignatureResult, TransactionInstruction } from '@solana/web3.js';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';
import React from 'react';
import { Code } from 'react-feather';

import { BaseTable } from '@/app/shared/ui/Table';

import { BodyTopRow } from './BaseInstructionCard';
import { BaseRawDetails } from './BaseRawDetails';
import { BaseRawParsedDetails } from './BaseRawParsedDetails';

type InstructionProps = {
    title: string;
    children?: React.ReactNode;
    result: SignatureResult;
    index: number;
    ix: TransactionInstruction | ParsedInstruction;
    defaultRaw?: boolean;
    innerCards?: JSX.Element[];
    childIndex?: number;
    // raw can be used to display raw instruction information
    // depends on whether the transaction was received from blockchain (TransactionInstruction)
    // or generated at the inspector (MessageCompiledInstruction)
    raw?: TransactionInstruction;
    // will be triggered on requesting raw data for instruction, if present
    onRequestRaw?: () => void;
};

export function InspectorInstructionCard({
    title,
    children,
    result,
    index,
    ix,
    defaultRaw,
    innerCards,
    childIndex,
    raw,
    onRequestRaw,
}: InstructionProps) {
    const [resultClass] = ixResult(result, index);
    const [showRaw, setShowRaw] = React.useState(defaultRaw || false);
    const rawClickHandler = () => {
        if (!defaultRaw && !showRaw && !raw) {
            // trigger handler to simulate behaviour for the InstructionCard for the transcation which contains logic in it to fetch raw transaction data
            onRequestRaw?.();
        }

        return setShowRaw(r => !r);
    };
    const scrollAnchorRef = useScrollAnchor(
        getInstructionCardScrollAnchorId(childIndex !== undefined ? [index + 1, childIndex + 1] : [index + 1]),
    );
    // The inspector decodes the wire message itself, so `ix` is already the raw instruction and no
    // `raw` prop arrives. Same fallback the Raw view below uses.
    const rawForDisplay = raw ?? ('parsed' in ix ? undefined : ix);
    const intent = useInstructionIntentSlots({
        onRequestRaw,
        programId: ix.programId.toString(),
        raw: rawForDisplay,
    });

    return (
        <CollapsibleCard
            ref={scrollAnchorRef}
            // The intent row draws its own top edge in the card outline colour, which replaces the header's line.
            headerDivider={!intent.panel}
            title={
                <>
                    <Badge ui="dashkit" variant={resultClass as 'success' | 'warning' | 'dark'} className="mr-1.5">
                        #{index + 1}
                        {childIndex !== undefined ? `.${childIndex + 1}` : ''}
                    </Badge>
                    {title}
                </>
            }
            headerButtons={
                <div className="flex items-center gap-1.5">
                    {intent.button}
                    <Button
                        ui="dashkit"
                        size="sm"
                        variant={showRaw ? 'black' : 'white'}
                        active={showRaw}
                        disabled={defaultRaw}
                        className={cn('flex items-center', defaultRaw && '!pointer-events-auto cursor-not-allowed')}
                        onClick={rawClickHandler}
                    >
                        <Code className="mr-1.5" size={13} /> Raw
                    </Button>
                </div>
            }
        >
            <BaseTable ui="dashkit" variant="card" nowrap className="[&>tbody>tr:first-child>td]:!border-t-0">
                <BaseTable.Body>
                    {intent.panel && <BodyTopRow>{intent.panel}</BodyTopRow>}
                    <ProgramField programId={ix.programId} showExtendedInfo={showRaw} />
                    {showRaw ? (
                        'parsed' in ix ? (
                            <BaseRawParsedDetails ix={ix}>
                                {raw ? <BaseRawDetails ix={raw} /> : null}
                            </BaseRawParsedDetails>
                        ) : (
                            <BaseRawDetails ix={raw || ix} />
                        )
                    ) : (
                        children
                    )}
                    {innerCards && innerCards.length > 0 && (
                        <>
                            <BaseTable.Row className="bg-dark-background text-dk-xs font-semibold uppercase tracking-[0.08em] text-dark-muted-foreground">
                                <BaseTable.Cell colSpan={3}>Inner Instructions</BaseTable.Cell>
                            </BaseTable.Row>
                            <BaseTable.Row>
                                <BaseTable.Cell colSpan={3}>
                                    <div className="m-6">{innerCards}</div>
                                </BaseTable.Cell>
                            </BaseTable.Row>
                        </>
                    )}
                </BaseTable.Body>
            </BaseTable>
        </CollapsibleCard>
    );
}

function ixResult(result: SignatureResult, index: number) {
    if (result.err) {
        const err = result.err as any;
        const ixError = err['InstructionError'];
        if (ixError && Array.isArray(ixError)) {
            const [errorIndex, error] = ixError;
            if (Number.isInteger(errorIndex) && errorIndex === index) {
                return ['warning', `Error: ${JSON.stringify(error)}`];
            }
        }
        return ['dark'];
    }
    return ['success'];
}
