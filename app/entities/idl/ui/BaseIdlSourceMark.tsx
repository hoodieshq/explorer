import { cva } from 'class-variance-authority';

/**
 * The radio mark that leads an IDL source in the selector menu: a ring for every source, with a dot in the one in
 * use. Same look as the filter menus' single-pick mark (HOO-1823), so the two menus read alike.
 */
export function BaseIdlSourceMark({ active }: { active: boolean }) {
    return (
        // One line tall (`1lh`), with the 14px ring centred in it, so the mark sits on the label's first line even
        // when a long file name wraps.
        <span aria-hidden className="flex h-[1lh] shrink-0 items-center">
            <span className={ringVariants({ active })}>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </span>
        </span>
    );
}

const ringVariants = cva('flex h-3.5 w-3.5 items-center justify-center rounded-full border border-solid', {
    variants: {
        active: {
            false: 'border-outer-space-600',
            true: 'border-accent',
        },
    },
});
