import { Button } from '@components/shared/ui/button';
import { AlignLeft, Loader } from 'react-feather';

/**
 * The "Intent" toggle in an instruction card header. The same Button as the Raw toggle beside it
 * (`white` closed, `black` + `active` open), so the pair always matches; icon-only below `md`.
 * A missing intent uses `dashed`: visible with the icon alone, at the same size.
 */
export function BaseInstructionIntentButton({
    open,
    busy = false,
    missing = false,
    controls,
    onClick,
}: {
    open: boolean;
    busy?: boolean;
    /** The intent could not be had (no metadata, no bytes, not identified, or failed to load). */
    missing?: boolean;
    /** Id of the intent row this button opens. */
    controls?: string;
    onClick: () => void;
}) {
    const label = missing ? 'Intent unavailable' : 'Intent';

    return (
        <Button
            ui="dashkit"
            size="sm"
            variant={open ? 'black' : 'white'}
            active={open}
            dashed={missing}
            aria-label={label}
            title={label}
            aria-expanded={open}
            aria-controls={controls}
            aria-busy={busy || undefined}
            onClick={onClick}
            // Icon-only below `md`, the button has no text line to set its height and shrinks to the icon;
            // stretching to the header row keeps it as tall as the labelled Raw beside it.
            className="flex items-center self-stretch"
            data-testid="instruction-intent-trigger"
        >
            {busy ? (
                <Loader size={13} className="animate-spin md:mr-1.5" />
            ) : (
                <AlignLeft size={13} className="md:mr-1.5" />
            )}
            <span className="hidden md:inline">Intent</span>
        </Button>
    );
}
