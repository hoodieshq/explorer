import { useExplorerLink } from '@entities/cluster';
import { ProgramLogs, TxErrorStatus, TxInvocationStatus, TxSimulationStatus } from '@entities/program-logs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { ReactNode } from 'react';

import { Card } from '@/app/shared/ui/Card';
import type { InstructionLogs } from '@/app/utils/program-logs';

import type { InstructionInvocationResult, InstructionSimulationResult } from '../model/transaction/types';

type InstructionInvocationActivityProps = {
    lastResult?: InstructionInvocationResult;
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
    lastSimulation?: InstructionSimulationResult;
    parseLogs: (logs: string[]) => InstructionLogs[];
};

export function InstructionSimulationActivity({ lastSimulation, parseLogs }: InstructionSimulationActivityProps) {
    const tabs = [
        {
            component: (
                <ProgramLogs
                    header={lastSimulation && <SimulationStatusHeader lastSimulation={lastSimulation} />}
                    logs={lastSimulation?.logs ?? []}
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

function TxStatusHeader({ lastResult }: { lastResult: NonNullable<InstructionInvocationResult> }) {
    const signature = lastResult.status === 'success' ? lastResult.signature : lastResult.signature;
    const serializedTxMessage = lastResult.status === 'success' ? null : lastResult.serializedTxMessage;
    const { link: txLink } = useExplorerLink(`/tx/${signature ?? ''}`);
    const { link: inspectorLink } = useExplorerLink(
        `/tx/inspector?message=${encodeURIComponent(serializedTxMessage ?? '')}`,
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
    if (lastResult.status === 'error' && lastResult.signature) {
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
            message={lastResult.serializedTxMessage ?? lastResult.message}
            date={lastResult.finishedAt}
            link={lastResult.serializedTxMessage ? inspectorLink : null}
        />
    );
}

function SimulationStatusHeader({ lastSimulation }: { lastSimulation: NonNullable<InstructionSimulationResult> }) {
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
