import { Skeleton } from '@components/shared/ui/skeleton';
import type { ReactNode } from 'react';

import { type InstructionIntentResult, INTENT_FAILED_TEXT } from '../lib/intent';
import { IntentSentence } from './IntentSentence';

export function InstructionIntentListItemBody({
    intent,
    programName,
}: {
    intent: InstructionIntentResult;
    programName: string;
}): ReactNode {
    switch (intent.status) {
        case 'idle':
        case 'loading':
            return <Skeleton className="mt-1 h-3.5 w-3/4" data-testid="instruction-intent-list-item-loading" />;
        case 'ready':
            return <IntentSentence parts={intent.result.sentenceParts} />;
        case 'failed':
            return (
                <span className="text-sm text-dk-danger" data-testid="instruction-intent-list-item-failed">
                    {INTENT_FAILED_TEXT}
                    {intent.retry && (
                        <>
                            {' '}
                            <button
                                type="button"
                                className="border-0 bg-transparent p-0 text-sm text-dark-accent underline-offset-2 hover:underline"
                                onClick={intent.retry}
                                data-testid="instruction-intent-list-item-retry"
                            >
                                Retry
                            </button>
                        </>
                    )}
                </span>
            );
        case 'unavailable':
            return (
                <span className="text-sm" data-testid="instruction-intent-list-item-unavailable">
                    <span className="text-neutral-300">{programName}</span>
                    <span className="text-outer-space-300"> · intent unavailable</span>
                </span>
            );
    }
}
