import { Idl as AnchorIdl } from '@coral-xyz/anchor';
import type { InstructionData } from '@entities/idl/formatters/formatted-idl';
import { getIdlVersion } from '@entities/idl/lib/idl-version';
import { useLayoutEffect, useState } from 'react';

import { Label } from '@/app/components/shared/ui/label';
import { Switch } from '@/app/components/shared/ui/switch';
import type { InstructionLogs } from '@/app/utils/program-logs';

import { BaseIdl } from '../model/unified-program';
import type { InstructionCallParams } from '../model/use-instruction-form';
import { ClusterSelector } from './ClusterSelector';
import { ConnectWallet } from './ConnectWallet';
import { InstructionActivity } from './InstructionActivity';
import { InteractInstructions } from './InteractInstructions';

export function InteractWithIdlView({
    instructions,
    idl,
    onExecuteInstruction,
    onTransactionSuccess,
    onTransactionError,
    logs,
    parseLogs,
    isExecuting,
    lastError,
    lastSuccess,
}: {
    instructions: InstructionData[];
    idl: BaseIdl | AnchorIdl | undefined;
    onExecuteInstruction: (data: InstructionData, params: InstructionCallParams) => Promise<void>;
    onTransactionSuccess?: (txSignature: string) => void;
    onTransactionError?: (error: string) => void;
    logs: string[];
    parseLogs: (logs: string[]) => InstructionLogs[];
    isExecuting?: boolean;
    lastError?: string | null;
    lastSuccess?: string | null;
}) {
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    const allInstructionNames = instructions.map(instruction => instruction.name);

    const areAllExpanded =
        expandedSections.length === allInstructionNames.length &&
        allInstructionNames.every(name => expandedSections.includes(name));

    // Handle success state
    useLayoutEffect(() => {
        if (lastSuccess && !isExecuting) {
            onTransactionSuccess?.(lastSuccess);
        }
    }, [lastSuccess, isExecuting, onTransactionSuccess]);

    // Handle error state
    useLayoutEffect(() => {
        if (lastError && !isExecuting) {
            onTransactionError?.(lastError);
        }
    }, [lastError, isExecuting, onTransactionError]);

    const handleExpandAllToggle = (checked: boolean) => {
        const sections = checked ? allInstructionNames : [];
        setExpandedSections(sections);
    };

    return (
        <div className="e-container e-mx-auto e-px-4">
            {/* Main Grid Layout - responsive */}
            <div className="e-grid e-gap-6 md:e-grid-cols-12">
                {/* Interact Header */}
                <div className="e-flex e-items-center e-justify-between md:e-col-span-12">
                    <p className="e-mb-0 e-text-sm e-text-neutral-400">
                        Anchor{idl ? `: ${getIdlVersion(idl as any)}` : ''}
                    </p>
                    <div className="e-flex e-items-center e-gap-3">
                        <Switch id="expand-all" checked={areAllExpanded} onCheckedChange={handleExpandAllToggle} />
                        <Label htmlFor="expand-all" className="e-cursor-pointer e-text-xs e-text-white">
                            Expand all
                        </Label>
                    </div>
                </div>

                {/* Left Column - Instructions */}
                <div className="e-order-2 md:e-order-1 md:e-col-span-6">
                    <InteractInstructions
                        instructions={instructions}
                        expandedSections={expandedSections}
                        setExpandedSections={setExpandedSections}
                        onExecuteInstruction={onExecuteInstruction}
                        isExecuting={isExecuting}
                    />
                </div>

                {/* Right Column - Controls & Logs */}
                <div className="e-order-1 md:e-order-2 md:e-col-span-6">
                    <div className="e-sticky e-top-0 e-flex e-max-h-svh e-flex-col e-gap-y-4">
                        <ClusterSelector />

                        <ConnectWallet />

                        <InstructionActivity logs={logs} parseLogs={parseLogs} />
                    </div>
                </div>
            </div>
        </div>
    );
}
