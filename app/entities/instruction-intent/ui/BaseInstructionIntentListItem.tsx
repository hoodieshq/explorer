import { Badge } from '@components/shared/ui/badge';
import { Skeleton } from '@components/shared/ui/skeleton';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';

import { type InstructionIntentResult, INTENT_FAILED_TEXT } from '../lib/intent';
import { IntentSentence } from './IntentSentence';

type ItemContent = {
    intent: InstructionIntentResult;
    programName: string;
    instructionName?: string;
};

export function BaseInstructionIntentListItem({ index, ...content }: ItemContent & { index: number }) {
    return (
        <li className="col-span-2 grid grid-cols-subgrid items-start py-1" data-testid="instruction-intent-list-item">
            <div className="text-sm leading-normal">
                <a href={`#${getInstructionCardScrollAnchorId([index + 1])}`} className="no-underline">
                    <Badge variant="success" className="align-baseline">
                        #{index + 1}
                    </Badge>
                </a>
            </div>
            <div className="min-w-0 pt-px">
                <ItemBody {...content} />
            </div>
        </li>
    );
}

function ItemBody({ intent, programName, instructionName }: ItemContent) {
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
                    <span className="text-neutral-300">
                        {instructionName ? `${programName}: ${instructionName}` : programName}
                    </span>
                    <span className="text-outer-space-300"> · intent unavailable</span>
                </span>
            );
    }
}
