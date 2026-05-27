import { useExplorerLink } from '@entities/cluster';
import { ProgramLogs, TxErrorStatus, TxInvocationStatus, TxSimulationStatus } from '@entities/program-logs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { ReactNode } from 'react';

import { Card } from '@/app/shared/ui/Card';
import type { InstructionLogs } from '@/app/utils/program-logs';

import type { InstructionInvocationResult, InstructionSimulationResult } from '../model/transaction/types';

type InstructionInvocationActivityProps = {
    lastResult?: InstructionInvocationResult | null;
    parseLogs: (logs: string[]) => InstructionLogs[];
};
// FIXME: missing Storybook story — pure props, but uses useExplorerLink internally so needs withCluster decorator.
export function InstructionInvocationActivity({ lastResult, parseLogs }: InstructionInvocationActivityProps) {
    const tabs = [
        {
            component: (
                <ProgramLogs
                    header={lastResult && <TxStatusHeader lastResult={lastResult} />}
                    logs={lastResult?.logs ?? []}
                    parseLogs={parseLogs}
                />
            ),
            id: 'program-logs',
            title: 'Program logs',
        },
    ];
    return <CardWithTabs tabs={tabs} />;
}

type InstructionSimulationActivityProps = {
    lastSimulation?: InstructionSimulationResult | null;
    parseLogs: (logs: string[]) => InstructionLogs[];
};

export function InstructionSimulationActivity({ lastSimulation, parseLogs }: InstructionSimulationActivityProps) {
    const tabs = [
        {
            component: (
                <ProgramLogs
                    header={lastSimulation && <SimulationStatusHeader lastSimulation={lastSimulation} />}
                    logs={lastSimulation && 'logs' in lastSimulation ? lastSimulation.logs : []}
                    parseLogs={parseLogs}
                />
            ),
            id: 'program-logs',
            title: 'Program logs',
        },
    ];
    return <CardWithTabs tabs={tabs} />;
}

function CardWithTabs({ tabs }: { tabs: { id: string; title: string; component: ReactNode }[] }) {
    return (
        <Card variant="tight" className="e-flex e-min-h-0 e-flex-grow e-flex-col">
            <Tabs defaultValue={tabs[0]?.id} className="e-flex e-min-h-0 e-flex-col">
                <div className="e-border-b e-border-neutral-950 e-px-6 [border-bottom-style:solid]">
                    <TabsList className="-e-mb-px">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.id} value={tab.id}>
                                {tab.title}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                {tabs.map(tab => (
                    <TabsContent
                        key={tab.id}
                        value={tab.id}
                        className="e-flex e-min-h-0 e-flex-1 e-flex-col e-px-6 e-py-2"
                    >
                        {tab.component}
                    </TabsContent>
                ))}
            </Tabs>
        </Card>
    );
}

function TxStatusHeader({ lastResult }: { lastResult: InstructionInvocationResult }) {
    const { link: txLink } = useExplorerLink(`/tx/${getTxSignature(lastResult) ?? ''}`);
    const { link: inspectorLink } = useExplorerLink(
        `/tx/inspector?message=${encodeURIComponent(getInspectorMessage(lastResult) ?? '')}`,
    );

    if (lastResult.status === 'success') {
        return (
            <TxInvocationStatus
                status="success"
                signature={lastResult.signature}
                date={lastResult.finishedAt}
                link={txLink}
            />
        );
    }
    if (lastResult.phase === 'broadcast_failed') {
        return (
            <TxInvocationStatus
                status="error"
                signature={lastResult.signature}
                date={lastResult.finishedAt}
                link={txLink}
            />
        );
    }
    return (
        <TxErrorStatus
            message={lastResult.message}
            date={lastResult.finishedAt}
            link={lastResult.serializedTxMessage ? inspectorLink : null}
        />
    );
}

function SimulationStatusHeader({ lastSimulation }: { lastSimulation: InstructionSimulationResult }) {
    const { link: inspectorLink } = useExplorerLink(
        `/tx/inspector?message=${encodeURIComponent(lastSimulation.serializedTxMessage ?? '')}`,
    );
    const link = lastSimulation.serializedTxMessage ? inspectorLink : undefined;

    if (lastSimulation.status === 'success') {
        return (
            <TxSimulationStatus
                status="success"
                unitsConsumed={lastSimulation.unitsConsumed}
                date={lastSimulation.finishedAt}
                link={link}
            />
        );
    }
    return (
        <TxSimulationStatus
            status="error"
            message={lastSimulation.message}
            date={lastSimulation.finishedAt}
            link={link}
        />
    );
}


// Signature exists on a successful tx and on a broadcast that later failed; never on a local error.
function getTxSignature(result: InstructionInvocationResult): string | null {
    if (result.status === 'success') return result.signature;
    if (result.phase === 'broadcast_failed') return result.signature;
    return null;
}

// Only execution_failed carries a serialized message worth an inspector link.
function getInspectorMessage(result: InstructionInvocationResult): string | null {
    if (result.status === 'error' && result.phase === 'execution_failed') return result.serializedTxMessage;
    return null;
}
