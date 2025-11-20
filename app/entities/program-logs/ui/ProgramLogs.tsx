import { SolarizedJsonViewer } from '@components/common/JsonViewer';
import { Button } from '@shared/ui/button';
import { cva } from 'class-variance-authority';
import { useState } from 'react';
import { Code } from 'react-feather';

import { Copyable } from '@/app/components/common/Copyable';
import { useExplorerLink } from '@/app/entities/cluster/model/use-explorer-link';
import type { InstructionLogs } from '@/app/utils/program-logs';

export function ProgramLogs({
    lastSuccess,
    logs,
    parseLogs,
    programName,
}: {
    lastSuccess?: string | null;
    logs: string[];
    parseLogs: (logs: string[]) => InstructionLogs[];
    programName?: string;
}) {
    const [showRaw, setShowRaw] = useState(false);

    const content = showRaw ? (
        <div className="e-rounded-lg e-bg-gray-900 e-p-3">
            <SolarizedJsonViewer
                src={logs}
                name={false}
                collapsed={false}
                style={{ fontSize: '14px', padding: '0', wordBreak: 'break-word' }}
            />
        </div>
    ) : (
        <ProgramLogRows lastSuccess={lastSuccess} logs={parseLogs(logs)} programName={programName} />
    );

    return (
        <div className="e-flex e-min-h-0 e-flex-col e-gap-1">
            <div className="e-flex e-justify-end">
                <Button variant={showRaw ? 'accent' : 'outline'} size="sm" onClick={() => setShowRaw(!showRaw)}>
                    <Code size={12} />
                    Raw
                </Button>
            </div>
            <div className="e-flex e-min-h-0 e-flex-col e-gap-2 e-overflow-auto">{content}</div>
        </div>
    );
}

function ProgramLogRows({
    lastSuccess,
    logs,
    programName,
}: {
    lastSuccess?: string | null;
    logs: InstructionLogs[];
    programName?: string;
}) {
    const logsContent =
        logs.length > 0 ? (
            <div>
                {logs.map((log, index) => (
                    <ProgramLogRow key={index} entry={log} index={index} programName={programName} />
                ))}
            </div>
        ) : (
            <div className="e-flex e-items-center e-justify-center e-pb-6 e-text-center">
                <p className="e-m-0 e-text-sm e-italic e-text-muted">No logs yet</p>
            </div>
        );

    return (
        <>
            {!lastSuccess ? null : <TransactionStatusHeader signature={lastSuccess} />}
            {logsContent}
        </>
    );
}

function ProgramLogRow({ entry, index, programName }: { entry: InstructionLogs; index: number; programName?: string }) {
    return (
        <div>
            <div>
                <span className={instructionNumberVariants({ variant: entry.failed ? 'destructive' : 'success' })}>
                    #{index + 1}
                </span>
                <span className="e-ml-1.5 e-text-xs">{programName ? `${programName} Instruction` : 'Instruction'}</span>
            </div>
            <div className="e-flex e-flex-col e-items-start e-p-2 e-font-mono e-text-sm">
                {entry.logs.map((log, key) => {
                    return (
                        <span key={key}>
                            <span className="e-text-neutral-500">{log.prefix}</span>
                            <span className={logTextVariants({ variant: log.style })}>{log.text}</span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

const logTextVariants = cva('e-font-mono e-text-xs e-leading-relaxed e-m-0', {
    defaultVariants: {
        variant: 'default',
    },
    variants: {
        variant: {
            default: 'e-text-neutral-400',
            info: 'e-text-cyan-500',
            muted: 'e-text-neutral-400',
            program: 'e-text-neutral-200',
            success: 'e-text-accent',
            warning: 'e-text-destructive',
        },
    },
});

const instructionNumberVariants = cva('e-py-0.5 e-px-1 e-text-xs e-rounded', {
    variants: {
        variant: {
            destructive: 'e-text-destructive e-bg-destructive-900 ',
            success: 'e-text-accent e-bg-accent-900',
        },
    },
});

function TransactionStatusHeader({ signature }: { signature: string }) {
    const { link } = useExplorerLink(`tx/${signature}`);
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
    });
    const timestamp = `${time} UTC`;

    return (
        <div className="e-flex e-items-center e-gap-4 e-rounded e-border-solid e-border-neutral-600 e-px-4 e-py-2">
            <div className="e-flex e-w-[156px] e-items-center e-gap-1">
                <span className="e-w-[134.65px] e-overflow-hidden e-text-ellipsis e-whitespace-nowrap e-font-mono e-text-sm e-tracking-tight e-text-[#2E9977]">
                    {signature}
                </span>
                <Copyable text={signature}> </Copyable>
            </div>
            <div className="e-flex e-w-[164px] e-items-center">
                <span className="e-text-xs e-tracking-tight e-text-[#2E9977]">{timestamp}</span>
            </div>
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="e-flex e-items-center e-justify-center e-rounded-[5px] e-bg-[#1E5E32] e-px-1.5 e-py-0.5 e-text-xs e-font-medium e-text-[#26E673] e-transition-colors hover:e-opacity-90"
            >
                Success
            </a>
        </div>
    );
}
