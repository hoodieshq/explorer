import { BASE_STROKE, NormalizedIcon } from './base';

/**
 * Alert circle on the normalized grid.
 *
 * Feather's glyph already inks the family's share of the 24 box, so its geometry (MIT) passes through
 * verbatim at `BASE_STROKE`; it lives here so new call sites get the shared display size.
 */
interface NormalizedAlertCircleProps {
    className?: string;
    size?: number;
}

export function NormalizedAlertCircle({ className, size }: NormalizedAlertCircleProps) {
    return (
        <NormalizedIcon
            aria-hidden="true"
            className={className}
            size={size}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={BASE_STROKE}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </NormalizedIcon>
    );
}
