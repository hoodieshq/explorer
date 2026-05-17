import { ProgramLogs } from '@entities/program-logs';
import { Badge } from '@shared/ui/badge';
import { Card } from '@shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { ReactNode } from 'react';

import { Copyable } from '@/app/components/common/Copyable';
import type { InstructionLogs } from '@/app/utils/program-logs';

import type { SimulationResult } from '../model/transaction/types';

type InstructionSimulationActivityProps = {
    lastSimulation?: SimulationResult;
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

function SimulationStatusHeader({ lastSimulation }: { lastSimulation: NonNullable<SimulationResult> }) {
    return lastSimulation.status === 'success' ? (
        <SimulationSuccessStatus unitsConsumed={lastSimulation.unitsConsumed} date={lastSimulation.finishedAt} />
    ) : (
        <SimulationErrorStatus message={lastSimulation.message} date={lastSimulation.finishedAt} />
    );
}

function formatTimestamp(date: Date): string {
    const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
    });
    return `${time} UTC`;
}

function SimulationSuccessStatus({ unitsConsumed, date }: { unitsConsumed: number | undefined; date: Date }) {
    return (
        <div className="e-border-1 e-flex e-items-center e-gap-2 e-rounded e-border e-border-solid e-border-neutral-600 e-px-4 e-py-2">
            {unitsConsumed !== undefined && (
                <div className="e-flex e-items-center e-gap-1">
                    <span className="e-text-xs e-tracking-tight e-text-accent-700">
                        {unitsConsumed.toLocaleString('en-US')} CU
                    </span>
                </div>
            )}
            <div className="e-flex e-items-center">
                <span className="e-whitespace-nowrap e-text-xs e-tracking-tight e-text-accent-700">
                    {formatTimestamp(date)}
                </span>
            </div>
            <Badge variant="success" size="xs" className="e-ml-auto">
                Simulated
            </Badge>
        </div>
    );
}

function SimulationErrorStatus({ message, date }: { message: string; date: Date }) {
    return (
        <div className="e-border-1 e-flex e-items-center e-gap-2 e-rounded e-border e-border-solid e-border-neutral-600 e-px-4 e-py-2">
            <div className="e-flex e-w-1/2 e-items-center e-gap-1">
                <Copyable text={message}>
                    <span className="e-overflow-hidden e-text-ellipsis e-whitespace-nowrap e-font-mono e-text-sm e-tracking-tight e-text-destructive">
                        {message}
                    </span>
                </Copyable>
            </div>
            <div className="e-flex e-items-center">
                <span className="e-whitespace-nowrap e-text-xs e-tracking-tight e-text-destructive">
                    {formatTimestamp(date)}
                </span>
            </div>
            <Badge variant="destructive" size="xs" className="e-ml-auto">
                Simulation Error
            </Badge>
        </div>
    );
}
