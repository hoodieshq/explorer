import React from 'react';
import { AlertCircle, Info } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

type InfoCardVariant = 'info' | 'warning';

type InfoCardProps = {
    children: React.ReactNode;
    className?: string;
    /**
     * Colour scheme + leading icon. `info` (default) is the blue "i" panel used
     * above the Verified Build table; `warning` reuses the same layout in
     * Security.txt's magenta palette (`destructive`) with an alert icon, for the
     * "self-reported by the author" caveat.
     */
    variant?: InfoCardVariant;
};

const VARIANTS: Record<InfoCardVariant, { Icon: typeof Info; container: string; icon: string }> = {
    info: {
        Icon: Info,
        container: cn(
            'border-blue-500/25 bg-blue-500/10 text-blue-100',
            '[&_a]:text-blue-300 [&_a]:underline hover:[&_a]:text-blue-200',
        ),
        icon: 'text-blue-300',
    },
    warning: {
        Icon: AlertCircle,
        // `dk-warning-on-dark` (#fa62fc) is the theme's dark-theme warning token; tint the
        // panel/border with it. The copy uses `destructive-200` — the lightest shade that
        // still reads as violet (`-100`/`-50` are effectively white and indistinguishable
        // from the default dark-theme body text).
        container: cn(
            'border-dk-warning-on-dark/25 bg-dk-warning-on-dark/10 text-destructive-200',
            '[&_a]:text-destructive-300 [&_a]:underline hover:[&_a]:text-destructive-200',
        ),
        icon: 'text-dk-warning-on-dark',
    },
};

/**
 * Informational note rendered as its own standalone card: a semi-transparent coloured panel
 * with a leading icon. Ported from H-explorer-pre-sorybook's `InfoCard`. Use for contextual
 * guidance that sits alongside (not inside) a data card — e.g. Security.txt's self-reported
 * caveat between the section header and the card.
 *
 * `border-solid` is explicit: this project ships no Tailwind preflight, so a bare `border`
 * sets only width and the border collapses to 0 without a style.
 */
export function InfoCard({ children, className, variant = 'info' }: InfoCardProps) {
    const { Icon, container, icon } = VARIANTS[variant];
    return (
        <div
            className={cn(
                'flex items-start gap-2.5 rounded-lg border border-solid p-3 text-dk-base',
                container,
                className,
            )}
        >
            <Icon size={16} className={cn('mt-0.5 shrink-0', icon)} />
            <div className="min-w-0">{children}</div>
        </div>
    );
}
