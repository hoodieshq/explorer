import { BaseInstructionCard } from '@components/common/BaseInstructionCard';
// Reached by module path, not the feature barrel: the barrel pulls in IdlInstructionCard, which
// renders this card, and the resulting import cycle is a bundler hazard for no gain.
import { useInstructionIntentSlots } from '@features/decode-instruction-with-idl/ui/InstructionIntent';
import { FetchStatus } from '@providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@providers/transactions/raw';
import { ParsedInstruction, SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React, { useCallback, useContext } from 'react';

import { SignatureContext } from './SignatureContext';

type InstructionProps = {
    title: string;
    children?: React.ReactNode;
    result: SignatureResult;
    index: number;
    ix: TransactionInstruction | ParsedInstruction;
    defaultRaw?: boolean;
    innerCards?: React.ReactNode[];
    eventCards?: React.ReactNode[];
    childIndex?: number;
    // Raw instruction for displaying accounts and hex data in raw mode (used by inspector)
    raw?: TransactionInstruction;
    headerButtons?: React.ReactNode;
    collapsible?: boolean;
};

export function InstructionCard({
    title,
    children,
    result,
    index,
    ix,
    defaultRaw,
    innerCards,
    eventCards,
    childIndex,
    raw: rawProp,
    headerButtons,
    collapsible,
}: InstructionProps) {
    const signature = useContext(SignatureContext);
    const rawDetails = useRawTransactionDetails(signature);

    // Use provided raw prop, or fetch from transaction details
    let raw: TransactionInstruction | undefined = rawProp;
    if (!raw && rawDetails && childIndex === undefined) {
        raw = rawDetails?.data?.raw?.transaction?.instructions[index];
    }

    const fetchRaw = useFetchRawTransaction();
    const fetchRawTrigger = useCallback(() => fetchRaw(signature), [signature, fetchRaw]);

    // Only allow fetching raw data if we have a valid signature (not in inspector mode), and only
    // while a fetch could still produce it: a v1 transaction has no web3.js instruction view, so
    // once its raw data has arrived, asking again would refetch on every open of the Raw view.
    const rawFetched = rawDetails?.status === FetchStatus.Fetched;
    const canFetchRaw = signature && !raw && !rawFetched;
    // Inner instructions never carry raw wire data, so their Raw view is the same with or without
    // it; only the top-level list has rows to lose.
    const rawUnavailable = rawFetched && raw === undefined && childIndex === undefined;
    // Cards that decode wire bytes themselves (codama, anchor) hand the instruction down as `ix`, and on
    // the inspector there is no signature to fetch a raw transaction against. Read the bytes off `ix`
    // when it carries them, so the summary does not depend on the raw fetch landing.
    const rawForDisplay = raw ?? ('parsed' in ix ? undefined : ix);
    // A failed fetch settles the intent as having no bytes rather than leaving it waiting for bytes that are not
    // coming; the Raw view above still offers its own retry, and bytes it brings reach the intent too.
    const rawFetchFailed = rawDetails?.status === FetchStatus.FetchFailed;
    const intent = useInstructionIntentSlots({
        // The raw transaction carries only top-level instructions, so fetching it cannot give an inner one bytes.
        onRequestRaw: canFetchRaw && !rawFetchFailed && childIndex === undefined ? fetchRawTrigger : undefined,
        programId: ix.programId.toString(),
        raw: rawForDisplay,
    });

    return (
        <BaseInstructionCard
            title={title}
            result={result}
            index={index}
            ix={ix}
            defaultRaw={defaultRaw}
            innerCards={innerCards}
            eventCards={eventCards}
            childIndex={childIndex}
            raw={raw}
            onRequestRaw={canFetchRaw ? fetchRawTrigger : undefined}
            rawUnavailable={rawUnavailable}
            headerButtons={
                <>
                    {headerButtons}
                    {intent.button}
                </>
            }
            bodyTop={intent.panel}
            collapsible={collapsible}
        >
            {children}
        </BaseInstructionCard>
    );
}
