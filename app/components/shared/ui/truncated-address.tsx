'use client';

import { cn } from '@components/shared/utils';

import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface TruncatedAddressProps {
    address: string;
    className?: string;
    display?: string;
    href?: string;
}

export function TruncatedAddress({ address, className, display, href }: TruncatedAddressProps) {
    const truncated = address.length > 8 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
    const shown = display ?? truncated;

    const inner = href ? (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('e-font-mono e-text-green-400 hover:e-underline', className)}
        >
            {shown}
        </a>
    ) : (
        <span className={cn('e-font-mono e-text-green-400', className)}>{shown}</span>
    );

    return (
        <Tooltip>
            <TooltipTrigger asChild>{inner}</TooltipTrigger>
            <TooltipContent side="top">
                <span className="e-text-green-400">{address}</span>
            </TooltipContent>
        </Tooltip>
    );
}
