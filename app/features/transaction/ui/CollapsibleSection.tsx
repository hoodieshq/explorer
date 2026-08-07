import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { baseCardVariants } from '@/app/shared/ui/Card';

type CollapsibleSectionProps = {
    id?: string;
    title: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    defaultExpanded?: boolean;
    /** When false, the collapse toggle is hidden and the body is always shown. Defaults to true. */
    collapsible?: boolean;
    className?: string;
    titleClassName?: string;
    sectionClassName?: string;
};

export function CollapsibleSection({
    id,
    title,
    actions,
    children,
    defaultExpanded = true,
    collapsible = true,
    className = baseCardVariants({ ui: 'dashkit' }),
    titleClassName,
    sectionClassName,
}: CollapsibleSectionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const headingId = useId();

    // When not collapsible, the body is always shown regardless of the (unused) toggle state.
    const isOpen = !collapsible || expanded;

    return (
        <section id={id} aria-labelledby={headingId} className={cn('flex flex-col gap-3', sectionClassName)}>
            <div data-section-title className={cn('flex items-center justify-between', titleClassName)}>
                <h2 id={headingId} className="m-0 text-lg font-normal text-white">
                    {title}
                </h2>
                {(collapsible || actions) && (
                    <div className="flex items-center gap-1">
                        {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
                        {collapsible && (
                            <Button
                                className="md:min-w-[86px]"
                                variant="outline"
                                aria-expanded={expanded}
                                size="sm"
                                aria-label={expanded ? 'Collapse' : 'Expand'}
                                onClick={() => setExpanded(v => !v)}
                            >
                                <ChevronDown
                                    size={12}
                                    className={cn(
                                        'transition-transform duration-200 ease-in-out',
                                        // keep this writing. this is working in case parent has trasform translate
                                        expanded && '[transform:rotate(180deg)]',
                                    )}
                                />
                                <span className="hidden md:inline-block">{expanded ? 'Collapse' : 'Expand'}</span>
                            </Button>
                        )}
                    </div>
                )}
            </div>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-in-out',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden">
                    <div className={className}>{children}</div>
                </div>
            </div>
        </section>
    );
}
