import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { ROW_PADDING } from '@shared/ui/spacing';
import { pluralUnits } from '@utils/index';
import { cva } from 'class-variance-authority';
import type { AriaAttributes, PropsWithChildren } from 'react';
import { ChevronDown } from 'react-feather';

const revealVariants = cva('grid transition-[grid-template-rows,opacity] duration-200 ease-in-out', {
    variants: { open: { false: 'grid-rows-[0fr] opacity-0', true: 'grid-rows-[1fr] opacity-100' } },
});

type BaseInstructionIntentListProps = PropsWithChildren<{
    ixsCount: number;
    open: boolean;
    listId: string;
    onToggle: () => void;
    className?: string;
}> &
    Omit<AriaAttributes, 'aria-expanded' | 'aria-label'>;

export function BaseInstructionIntentList({
    ixsCount,
    open,
    listId,
    onToggle,
    children,
    className,
    ...aria
}: BaseInstructionIntentListProps) {
    return (
        <div
            className={cn('flex flex-col bg-dark-background', ROW_PADDING, className)}
            data-testid="instruction-intent-list"
        >
            <div className="flex min-h-9 cursor-pointer items-start justify-between gap-3" onClick={onToggle}>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">What this transaction does</span>
                    <span className="text-xs text-outer-space-300" data-testid="instruction-intent-list-count">
                        {pluralUnits(ixsCount, 'instruction')}
                    </span>
                </div>
                <div className="flex shrink-0 items-center">
                    <Button
                        {...aria}
                        aria-expanded={open}
                        aria-label={open ? 'Hide intents' : 'Show intents'}
                        className="group !h-5 !w-5 [&_svg]:size-4"
                        onClick={event => {
                            event.stopPropagation();
                            onToggle();
                        }}
                        size="icon"
                        variant="ghost"
                        data-testid="instruction-intent-list-toggle"
                    >
                        <ChevronDown
                            size={16}
                            className="text-outer-space-300 transition-transform duration-200 ease-in-out group-aria-expanded:rotate-180"
                        />
                    </Button>
                </div>
            </div>
            <div className={revealVariants({ open })}>
                <div className="min-h-0 overflow-hidden">
                    <ol
                        id={listId}
                        className="m-0 grid list-none grid-cols-[max-content_1fr] gap-x-1.5 p-0 pt-1.5"
                        aria-live="polite"
                        inert={!open}
                    >
                        {children}
                    </ol>
                </div>
            </div>
        </div>
    );
}
