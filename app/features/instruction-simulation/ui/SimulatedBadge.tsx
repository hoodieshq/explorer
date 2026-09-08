import type { ReactNode } from 'react';

import { Badge } from '@/app/components/shared/ui/badge';

// The accent-outlined chip that marks simulation-derived UI: "S" on the Account List's Change column and
// on the inspector's Simulation tab, "Simulated" on a results card's title once a run has filled it. One
// component so all of those stay the same chip.
export function SimulatedBadge({ children }: { children: ReactNode }) {
    return (
        <Badge ui="dashkit" className="border-accent/50 border border-solid !text-[10px] text-accent">
            {children}
        </Badge>
    );
}
