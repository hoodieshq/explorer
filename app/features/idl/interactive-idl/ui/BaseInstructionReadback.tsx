import { cn } from '@components/shared/utils';
import { BaseIntentSentence } from '@entities/idl';
import { cva } from 'class-variance-authority';

import type { ReadbackPart } from '../model/display/build-readback';

const slotVariants = cva('rounded font-mono', {
    variants: {
        kind: {
            filled: 'bg-dark-accent/10 px-1 py-px text-sm text-dark-accent',
            missing: 'border border-dashed border-neutral-500 px-1.5 text-sm text-neutral-400',
        },
    },
});

/**
 * "Intent" above Execute: the instruction's intent as one line, always visible.
 * Dashed slots name what is still missing; once complete, the SDK's formatted sentence takes over.
 * No field list — the form above already is one.
 */
export function BaseInstructionReadback({
    parts,
    missing,
    sentence,
    className,
}: {
    parts: ReadbackPart[];
    missing: string[];
    /** The SDK's sentence for a complete form; the template parts render while it is absent. */
    sentence?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                // The card intent row's ground (the page background), so both intent surfaces read as one; rounded
                // and edged as the form's dark inputs above it.
                'flex flex-col gap-2 rounded border border-solid border-outer-space-950 bg-dark-background px-3.5 py-3',
                className,
            )}
            aria-live="polite"
            aria-atomic="true"
            data-testid="instruction-readback"
        >
            {/* The instruction card's intent label, with a Summary row label's colour for the quiet text: 4px from
                the label to the sentence (`-mb-1` against the 8px gap), 12px on to the note (`mt-1` on top). */}
            <span className="-mb-1 text-dk-xs font-medium uppercase tracking-[0.08em] text-outer-space-300">
                Intent
            </span>

            {sentence ? (
                <BaseIntentSentence sentence={sentence} size="sm" />
            ) : (
                <p className="m-0 break-words text-sm leading-normal text-white" data-testid="readback-template">
                    {/* Index key: the template is fixed per instruction, so part positions never move. */}
                    {parts.map((part, index) =>
                        part.kind === 'text' ? (
                            <span key={index}>{part.text}</span>
                        ) : part.kind === 'filled' ? (
                            <span key={index} className={slotVariants({ kind: 'filled' })} title={part.name}>
                                {part.text}
                            </span>
                        ) : (
                            <span key={index} className={slotVariants({ kind: 'missing' })}>
                                {part.name}
                            </span>
                        ),
                    )}
                </p>
            )}

            <p className="mb-0 mt-1 text-xs text-outer-space-300">
                {missing.length > 0
                    ? `Add ${formatList(missing)} to complete it.`
                    : 'Execute sends this to your wallet to sign.'}
            </p>
        </div>
    );
}

function formatList(names: string[]): string {
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
