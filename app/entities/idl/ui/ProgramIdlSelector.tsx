'use client';

import { useCluster } from '@providers/cluster';
import { useState } from 'react';

import {
    getOnChainIdlSourceOptions,
    getSelectedIdlSourceOption,
    toIdlSourceSelection,
} from '../model/custom-idl/idl-source-options';
import { useProgramIdlPreference } from '../model/custom-idl/use-program-idl-preference';
import { useProgramIdls } from '../model/use-program-idls';
import { BaseIdlSourceSelect } from './BaseIdlSourceSelect';
import { CustomIdlUploadDialog } from './CustomIdlUploadDialog';

/** The IDL source selector for one program, with its upload dialog. The choice applies on every page. */
export function ProgramIdlSelector({ programAddress }: { programAddress: string }) {
    const { url, cluster } = useCluster();
    const { onChainIdls } = useProgramIdls(programAddress, url, cluster);
    const { preference, addCustomIdl, removeCustomIdl, selectIdlSource } = useProgramIdlPreference(programAddress);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            <BaseIdlSourceSelect
                options={getOnChainIdlSourceOptions(onChainIdls)}
                value={getSelectedIdlSourceOption(onChainIdls, preference)}
                hasCustomIdl={Boolean(preference?.custom)}
                customIdlFileName={preference?.custom?.fileName}
                onSelect={option => selectIdlSource(toIdlSourceSelection(option, onChainIdls))}
                onAdd={() => setIsDialogOpen(true)}
                onRemove={removeCustomIdl}
            />
            <CustomIdlUploadDialog
                programAddress={programAddress}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={({ text, fileName }) => addCustomIdl(text, fileName)}
            />
        </>
    );
}
