import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { BaseInstructionDisplay } from '@entities/idl';
import { Loader } from 'react-feather';

/**
 * The three states behind the instruction summary mark: resolving, resolved, and nothing to show.
 * A resolved display renders raw base58 values - address enrichment belongs to the renderer, not here.
 */
export function BaseInstructionDisplayPopoverBody({
    display,
    isResolving,
}: {
    display?: InstructionDisplay;
    isResolving: boolean;
}) {
    if (isResolving) {
        return (
            <div
                className="flex items-center justify-center gap-2 py-1 text-xs text-neutral-400"
                data-testid="instruction-display-loading"
            >
                <Loader size={13} className="animate-spin" />
                Resolving…
            </div>
        );
    }

    if (!display) {
        return <p className="text-xs text-neutral-400">No summary available for this instruction.</p>;
    }

    return <BaseInstructionDisplay display={display} />;
}
