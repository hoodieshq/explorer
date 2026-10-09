'use client';

import { Button } from '@components/shared/ui/button';
import {
    CustomIdlUploadDialog,
    getOnChainIdlSourceOptions,
    getSelectedIdlSourceOption,
    type IdlSourceOption,
    type ProgramIdlPair,
    type ProgramIdlPreference,
    toIdlSourceSelection,
    useProgramIdlPreference,
    useProgramIdls,
} from '@entities/idl';
import { useCluster } from '@providers/cluster';
import { TransactionInstruction } from '@solana/web3.js';
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

import { isIdlInstructionDecoded, safeDecodeInstructionWithIdl } from '../lib/decode-instruction-with-idl';

const SOURCE_LABELS: Record<IdlSourceOption, string> = {
    anchor: 'Anchor',
    custom: 'Custom',
    programMetadata: 'PMP',
};

/**
 * Says the instruction was not decoded and tries the program's other IDLs right away: each one that decodes
 * it becomes a button that selects it. When none does, it offers to add (or replace) a custom IDL.
 */
export function IdlDecodeFailureNotice({ ix }: { ix: TransactionInstruction }) {
    const programAddress = ix.programId.toBase58();
    const { url, cluster } = useCluster();
    const { onChainIdls, isCustomIdl } = useProgramIdls(programAddress, url, cluster);
    const { preference, addCustomIdl, selectIdlSource } = useProgramIdlPreference(programAddress);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const selected = getSelectedIdlSourceOption(onChainIdls, preference);
    const alternatives = useMemo(
        () =>
            candidateSources(onChainIdls, preference)
                .filter(candidate => candidate.option !== selected)
                .filter(candidate => isIdlInstructionDecoded(safeDecodeInstructionWithIdl(ix, candidate.idl, url)))
                .map(candidate => candidate.option),
        [ix, onChainIdls, preference, selected, url],
    );

    const message = selected
        ? `The ${SOURCE_LABELS[selected]} IDL could not decode this instruction.`
        : 'No IDL decodes this instruction.';

    return (
        <span
            role="status"
            className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-2',
                isCustomIdl ? 'text-custom-idl' : 'text-white',
            )}
        >
            <span className="flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                {message}
            </span>
            {alternatives.length > 0 ? (
                <span className="flex flex-wrap items-center gap-2 text-neutral-400">
                    Decodes with:
                    {alternatives.map(option => (
                        <Button
                            key={option}
                            variant="outline"
                            size="sm"
                            onClick={() => selectIdlSource(toIdlSourceSelection(option, onChainIdls))}
                        >
                            {SOURCE_LABELS[option]}
                            {option === 'custom' ? '' : ' (on-chain)'}
                        </Button>
                    ))}
                </span>
            ) : (
                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                    {preference?.custom ? 'Replace custom IDL…' : 'Add custom IDL…'}
                </Button>
            )}
            <CustomIdlUploadDialog
                programAddress={programAddress}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={({ text, fileName }) => addCustomIdl(text, fileName)}
            />
        </span>
    );
}

// Every IDL the program could be decoded with, whatever is selected now.
function candidateSources(onChain: ProgramIdlPair, preference: ProgramIdlPreference | undefined) {
    const candidates: { option: IdlSourceOption; idl: unknown }[] = getOnChainIdlSourceOptions(onChain).map(option => ({
        idl: option === 'anchor' ? onChain.anchorIdl : onChain.programMetadataIdl,
        option,
    }));
    if (preference?.custom) candidates.push({ idl: preference.custom.idl, option: 'custom' });
    return candidates;
}
