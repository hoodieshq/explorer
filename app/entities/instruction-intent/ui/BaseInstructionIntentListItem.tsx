import { Badge } from '@components/shared/ui/badge';
import type { PropsWithChildren } from 'react';

export function BaseInstructionIntentListItem({
    index,
    href,
    children,
}: PropsWithChildren<{ index: number; href?: string }>) {
    const badge = (
        <Badge variant="success" className="align-baseline">
            #{index + 1}
        </Badge>
    );

    return (
        <li className="col-span-2 grid grid-cols-subgrid items-start py-1" data-testid="instruction-intent-list-item">
            <div className="text-sm leading-normal">
                {href ? (
                    <a href={href} className="no-underline">
                        {badge}
                    </a>
                ) : (
                    badge
                )}
            </div>
            <div className="min-w-0 pt-px">{children}</div>
        </li>
    );
}
