import { Slot } from '@radix-ui/react-slot';
import { ReactNode } from 'react';
import { AlertTriangle } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

interface BaseWarningCardProps {
    className?: string;
    message?: string;
    description?: string;
    children?: ReactNode;
    asChild?: boolean;
}

export function BaseWarningCard({ className, message, description, children, asChild = false }: BaseWarningCardProps) {
    const baseClassName = cn(
        'e-flex e-items-start e-gap-3 e-rounded-lg e-border e-border-orange-200 e-bg-orange-50 e-p-4',
        className
    );

    if (asChild) {
        return <Slot className={baseClassName}>{children}</Slot>;
    }

    const content = message ? (
        <div className="e-text-sm e-text-orange-800">
            <div className="e-mb-1">{message}</div>
            {description && <div className="e-text-xs e-opacity-80">{description}</div>}
        </div>
    ) : (
        <div className="e-text-sm e-text-orange-800">{children}</div>
    );

    return (
        <div className={baseClassName}>
            <AlertTriangle className="e-mt-0.5 e-h-5 e-w-5 e-flex-shrink-0 e-text-orange-600" />
            {content}
        </div>
    );
}
