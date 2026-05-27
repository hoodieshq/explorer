import { getIdlSpec, getIdlStandard, getIdlVersion, type InstructionData, type SupportedIdl } from '@entities/idl';
import { useState } from 'react';

import { Label } from '@/app/components/shared/ui/label';
import { Switch } from '@/app/components/shared/ui/switch';
import type { InstructionLogs } from '@/app/utils/program-logs';

import type { InstructionInvocationResult, InstructionSimulationResult } from '../model/transaction/types';
import type { InstructionCallParams } from '../model/use-instruction-form';
import { ClusterSelector } from './ClusterSelector';
import { ConnectWallet } from './ConnectWallet';
import { InstructionInvocationActivity, InstructionSimulationActivity } from './InstructionActivity';
import { InteractInstructions } from './InteractInstructions';

// FIXME: missing Storybook story — composes ConnectWallet + ClusterSelector + InteractInstructions; inherits wallet/cluster provider need.
export function InteractWithIdlView({
    instructions,
    idl,
    onExecuteInstruction,
    onSimulateInstruction,
    onSectionsExpanded,
    parseLogs,
    simulateParseLogs,
    isExecuting,
    isSimulating,
    lastResult,
    lastSimulation,
    lastAction,
}: {
    instructions: InstructionData[];
    idl: SupportedIdl | undefined;
    onExecuteInstruction: (data: InstructionData, params: InstructionCallParams) => Promise<void>;
    onSimulateInstruction: (data: InstructionData, params: InstructionCallParams) => Promise<void>;
    onSectionsExpanded?: (expandedSections: string[], programId?: string) => void;
    parseLogs: (logs: string[]) => InstructionLogs[];
    simulateParseLogs: (logs: string[]) => InstructionLogs[];
    isExecuting?: boolean;
    isSimulating?: boolean;
    lastResult: InstructionInvocationResult | null;
    lastSimulation: InstructionSimulationResult | null;
    lastAction: 'invoke' | 'simulate' | null;
}) {
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    const allInstructionNames = instructions.map(instruction => instruction.name);

    const areAllExpanded =
        expandedSections.length === allInstructionNames.length &&
        allInstructionNames.every(name => expandedSections.includes(name));

    const handleExpandAllToggle = (checked: boolean) => {
        const sections = checked ? allInstructionNames : [];
        setExpandedSections(sections);
        onSectionsExpanded?.(sections);
    };

    return (
        <div className="e-container e-mx-auto e-px-4">
            {/* Main Grid Layout - responsive */}
            <div className="e-grid e-gap-6 md:e-grid-cols-12">
                {/* Interact Header */}
                <div className="e-flex e-items-center e-justify-between md:e-col-span-12">
                    {idl && (
                        <p className="e-mb-0 e-text-sm e-text-neutral-400">
                            {getIdlStandard(idl)}: {getIdlVersion(idl)}
                            {getIdlSpec(idl) ? ` (spec: ${getIdlSpec(idl)})` : ''}
                        </p>
                    )}
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
                        idl={idl}
                        instructions={instructions}
                        expandedSections={expandedSections}
                        setExpandedSections={setExpandedSections}
                        onExecuteInstruction={onExecuteInstruction}
                        onSimulateInstruction={onSimulateInstruction}
                        onSectionsExpanded={onSectionsExpanded}
                        isExecuting={isExecuting}
                        isSimulating={isSimulating}
                    />
                </div>

                {/* Right Column - Controls & Logs */}
                <div className="e-order-1 e-h-full md:e-order-2 md:e-col-span-6">
                    <div className="e-top-4 md:e-sticky">
                        <div className="e-flex e-flex-col e-gap-y-4">
                            <ClusterSelector />

                            <ConnectWallet />

                            {lastAction === 'simulate' ? (
                                <InstructionSimulationActivity
                                    lastSimulation={lastSimulation}
                                    parseLogs={simulateParseLogs}
                                />
                            ) : (
                                <InstructionInvocationActivity lastResult={lastResult} parseLogs={parseLogs} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
