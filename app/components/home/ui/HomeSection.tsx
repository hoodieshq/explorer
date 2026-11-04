'use client';

import { type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Logger } from '@/app/shared/lib/logger';

// Render-time backstop for a homepage section. Each section already handles its own RPC loading/error
// states; this only catches an unexpected throw and drops that one section so the rest of the page
// survives. The failure is still reported to Sentry.
export function HomeSection({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary onError={error => Logger.panic(error)} fallback={<></>}>
            {children}
        </ErrorBoundary>
    );
}
