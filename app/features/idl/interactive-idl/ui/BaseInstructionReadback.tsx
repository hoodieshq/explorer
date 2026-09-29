import { cn } from '@components/shared/utils';
import { BaseIntentSentence } from '@entities/idl';
import { cva } from 'class-variance-authority';

import type { ReadbackPart } from '../model/display/build-readback';

const slotVariants = cva('rounded font-mono', {
    variants: {
        kind: {
            filled: 'bg-dark-accent/10 px-1 py-px text-sm text-dark-accent',
            missing: 'border border-dashed border-neutral-500 px-1.5 text-xs text-neutral-400',
        },
    },
});

/**
 * "Summary" above Execute: the instruction's intent as one line, always visible.
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
                'flex flex-col gap-1.5 rounded-lg border border-solid border-dark-border bg-heavy-metal-950 px-3.5 py-3',
                className,
            )}
            aria-live="polite"
            aria-atomic="true"
            data-testid="instruction-readback"
        >
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-400">Summary</span>

            {sentence ? (
                <BaseIntentSentence sentence={sentence} className="leading-[1.75]" />
            ) : (
                <p className="m-0 break-words text-base leading-[1.75] text-white" data-testid="readback-template">
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

            <p className="m-0 text-xs text-neutral-400">
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
