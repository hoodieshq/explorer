import { Badge } from '@shared/ui/badge';

import { formatLogTimestamp } from '../model/formatLogTimestamp';

export function SimulationSuccessStatus({ unitsConsumed, date }: { unitsConsumed: number | undefined; date: Date }) {
    return (
        <div className="e-flex e-items-center e-gap-2 e-rounded e-border e-border-solid e-border-neutral-600 e-px-4 e-py-2">
            {unitsConsumed !== undefined && (
                <div className="e-flex e-items-center e-gap-1">
                    <span className="e-text-xs e-tracking-tight e-text-accent-700">
                        {unitsConsumed.toLocaleString('en-US')} CU
                    </span>
                </div>
            )}
            <div className="e-flex e-items-center">
                <span className="e-whitespace-nowrap e-text-xs e-tracking-tight e-text-accent-700">
                    {formatLogTimestamp(date)}
                </span>
            </div>
            <Badge variant="success" size="xs" className="e-ml-auto">
                Simulated
            </Badge>
        </div>
    );
}
