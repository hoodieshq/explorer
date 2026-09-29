import { Button } from '@components/shared/ui/button';
import { AlignLeft, Loader } from 'react-feather';

/**
 * The "Intent" toggle in an instruction card header, next to Raw.
 * A text button rather than an ⓘ mark: the icon reads as "help", while this opens a plain-language view
 * of the instruction. The open state is styled off `aria-expanded`, so state and styling cannot drift.
 */
export function BaseInstructionIntentButton({
    open,
    busy = false,
    controls,
    onClick,
}: {
    open: boolean;
    busy?: boolean;
    /** Id of the intent row this button opens. */
    controls?: string;
    onClick: () => void;
}) {
    return (
        <Button
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls={controls}
            aria-busy={busy || undefined}
            onClick={onClick}
            className="aria-expanded:border-dark-accent aria-expanded:bg-dark-accent/10 aria-expanded:text-dark-accent aria-expanded:hover:bg-dark-accent/15 aria-expanded:hover:text-dark-accent"
            data-testid="instruction-intent-trigger"
        >
            {busy ? <Loader className="animate-spin" /> : <AlignLeft />}
            Intent
        </Button>
    );
}
