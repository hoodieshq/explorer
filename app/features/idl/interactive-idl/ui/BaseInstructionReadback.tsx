import { cn } from '@components/shared/utils';
import { BaseIntentSentence } from '@entities/idl';

import type { ReadbackPart } from '../model/display/build-readback';

// A value the form already holds, shown in place while the SDK's own sentence is still on its way.
const FILLED_SLOT = 'rounded bg-dark-accent/10 px-1 py-px font-mono text-sm text-dark-accent';

/**
 * "Intent" above Execute: the instruction's intent as one line, always visible.
 * Until every field is filled it asks for them; once complete, the SDK's formatted sentence takes over.
 * No field list — the form above already is one.
 */
export function BaseInstructionReadback({
    parts,
    sentence,
    className,
}: {
    parts: ReadbackPart[];
    /** The SDK's sentence for a complete form; the filled template renders while it is on its way. */
    sentence?: string;
    className?: string;
}) {
    const complete = parts.every(part => part.kind !== 'missing');

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
            ) : !complete ? (
                // The label's tone, so the quiet text in the block reads as one colour.
                <p className="m-0 text-sm leading-normal text-outer-space-300" data-testid="readback-incomplete">
                    Fill in all fields to see the intent.
                </p>
            ) : (
                <p className="m-0 break-words text-sm leading-normal text-white" data-testid="readback-template">
                    {/* Index key: the template is fixed per instruction, so part positions never move. */}
                    {parts.map((part, index) =>
                        part.kind === 'text' ? (
                            <span key={index}>{part.text}</span>
                        ) : part.kind === 'filled' ? (
                            <span key={index} className={FILLED_SLOT} title={part.name}>
                                {part.text}
                            </span>
                        ) : undefined,
                    )}
                </p>
            )}

            {/* One line in every state. */}
            <p className="mb-0 mt-1 text-xs text-outer-space-300">Execute sends this to your wallet to sign.</p>
        </div>
    );
}
