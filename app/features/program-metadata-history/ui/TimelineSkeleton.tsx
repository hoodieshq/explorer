'use client';

import React from 'react';

import { Skeleton } from '@/app/components/shared/ui/skeleton';

export function TimelineSkeleton() {
    return (
        <div className="e-relative e-pl-8">
            <div className="e-absolute e-left-[7px] e-top-2 e-bottom-2 e-w-px e-bg-neutral-700" />
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="e-relative e-mb-6">
                    <div className="e-absolute e-left-[-25px] e-top-1.5 e-h-3 e-w-3 e-rounded-full e-bg-neutral-700" />
                    <Skeleton className="e-mb-2 e-h-5 e-w-40" />
                    <Skeleton className="e-mb-1 e-h-4 e-w-64" />
                    <Skeleton className="e-h-4 e-w-48" />
                </div>
            ))}
        </div>
    );
}
