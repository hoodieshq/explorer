import { CheckCircle, Copy, XCircle } from 'react-feather';

import type { CopyState } from '@/app/shared/lib/useCopyToClipboard';

/**
 * The address component's copy glyph (`Copyable`: a bare 13px icon in the surrounding text's color, a check after
 * copying, a cross on failure) as a real button, so it has a name and takes keyboard focus. The caller owns the
 * copy state, so a click elsewhere (a JSON row's text) can flip the same icon.
 */
export function InlineCopyButton({
    noun,
    state,
    onCopy,
}: {
    /** What is copied, e.g. "JSON" → "Copy JSON" / "Copied JSON". */
    noun: string;
    state: CopyState;
    onCopy: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={`${state === 'copied' ? 'Copied' : 'Copy'} ${noun}`}
            onClick={onCopy}
            // `Copyable`'s 12px wrapper and `align-text-top` icon, on a bare button. Ring, not outline: the global
            // `button:focus { outline: none !important }` would win otherwise.
            className="m-0 cursor-pointer rounded-sm border-0 bg-transparent p-0 text-[12px] leading-none text-inherit focus-visible:ring-2 focus-visible:ring-accent"
        >
            {/* The check and cross take `Copyable`'s colors, so both copy controls read the same. */}
            {state === 'copied' ? (
                <CheckCircle className="align-text-top text-dk-info" size={13} />
            ) : state === 'errored' ? (
                <XCircle className="align-text-top text-dk-danger" size={13} />
            ) : (
                <Copy className="align-text-top" size={13} />
            )}
        </button>
    );
}
