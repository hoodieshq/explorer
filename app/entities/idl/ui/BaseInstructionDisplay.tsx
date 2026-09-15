import type { InstructionDisplay } from '@codama/dynamic-instructions';

/**
 * The body of an sRFC 39 display: the intent sentence and the fields behind it.
 * Values are raw base58 by design - the display layer leaves address presentation to the renderer.
 */
export function BaseInstructionDisplay({ display, className }: { display: InstructionDisplay; className?: string }) {
    return (
        <div className={className}>
            <p className="break-all text-xs text-white" data-testid="instruction-display-intent">
                {display.interpolatedIntent ?? display.intent}
            </p>

            {display.fields.length > 0 && (
                <dl className="mt-3 space-y-1.5">
                    {/* Index key: an argument and an account can share a name, so labels are not unique. */}
                    {display.fields.map((field, index) => (
                        <div key={index} className="flex gap-3 text-xs">
                            <dt className="w-28 shrink-0 text-neutral-400">{field.label}</dt>
                            <dd className="min-w-0 break-all text-neutral-200">{field.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
