import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { cn } from '@shared/utils';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Copy } from 'react-feather';

import { type StatisticsItem, useRpcCallsStatistics } from '../model/use-rpc-calls-statistics';

export function RpcCallsStatistics({ className }: { className?: string }) {
    const { statistics } = useRpcCallsStatistics();

    const content = (
        <>
            {statistics.length === 0 ? (
                <p className="e-text-sm e-text-neutral-400">No statistics available yet.</p>
            ) : (
                <>
                    <div className="e-mb-2 e-flex e-justify-end">
                        <CopyStatisticsButton statistics={statistics} />
                    </div>
                    <div className="e-overflow-x-auto">
                        <table className="e-w-full e-border-collapse e-border-heavy-metal-900 e-text-xs">
                            <thead>
                                <tr className="e-border-b e-bg-heavy-metal-900">
                                    <th className="e-px-4 e-py-2 e-text-left e-font-semibold">Method</th>
                                    <th className="e-px-4 e-py-2 e-text-right e-font-semibold">Count</th>
                                    <th className="e-px-4 e-py-2 e-text-right e-font-semibold">Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statistics.map(({ method, count, percentage }) => (
                                    <tr
                                        key={method}
                                        className="e-cursor-pointer e-border-b e-transition-colors hover:e-bg-gray-800"
                                    >
                                        <td className="e-px-4 e-py-2">{method}</td>
                                        <td className="e-px-4 e-py-2 e-text-right">{count}</td>
                                        <td className="e-px-4 e-py-2 e-text-right">{percentage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </>
    );

    return (
        <Card
            variant="narrow"
            className={cn(
                'e-flex e-w-full e-flex-col e-gap-[7px] e-border e-border-heavy-metal-950 e-bg-heavy-metal-800 e-px-3 e-py-2',
                className
            )}
        >
            {content}
        </Card>
    );
}

function CopyStatisticsButton({ statistics }: { statistics: StatisticsItem[] }) {
    const [copyState, setCopyState] = useState<'copy' | 'copied'>('copy');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const formatAsMarkdownTable = () => {
        const header = '| Method | Count | Percentage |\n|--------|-------|------------|\n';
        const rows = statistics
            .map(({ method, count, percentage }) => `| ${method} | ${count} | ${percentage} |`)
            .join('\n');
        return header + rows;
    };

    const handleCopy = async () => {
        try {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            const markdownTable = formatAsMarkdownTable();
            await navigator.clipboard.writeText(markdownTable);
            setCopyState('copied');
            timeoutRef.current = setTimeout(() => {
                setCopyState('copy');
                timeoutRef.current = null;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Button size="sm" onClick={handleCopy} title="Copy as Markdown table">
            {copyState === 'copy' ? (
                <>
                    <Copy />
                    <span>Copy as MD</span>
                </>
            ) : (
                <>
                    <CheckCircle />
                    <span>Copied!</span>
                </>
            )}
        </Button>
    );
}
