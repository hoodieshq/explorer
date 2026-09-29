import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { AddressLink } from '@components/shared/address';
import { cn } from '@components/shared/utils';
import { isAddress } from '@solana/kit';

import { BaseIntentSentence } from './BaseIntentSentence';

/**
 * The body of an sRFC 39 display: the intent sentence and the labelled fields behind it.
 * The sentence shortens its addresses; the fields keep them whole, with copy, so both reads stay available.
 * Without a sentence the short `intent` label leads instead.
 */
export function BaseInstructionDisplay({ display, className }: { display: InstructionDisplay; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <BaseIntentSentence sentence={display.interpolatedIntent ?? display.intent} />

            {display.fields.length > 0 && <BaseDisplayFields fields={display.fields} />}
        </div>
    );
}

/** Label/value rows of the display's fallback list; stacked on narrow screens so long addresses keep their width. */
export function BaseDisplayFields({ fields, className }: { fields: InstructionDisplay['fields']; className?: string }) {
    return (
        <dl
            className={cn('m-0 flex flex-col border-0 border-t border-solid border-white/5 pt-1 text-sm', className)}
            data-testid="intent-fields"
        >
            {/* Index key: an argument and an account can share a name, so labels are not unique. */}
            {fields.map((field, index) => (
                <div
                    key={index}
                    className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                    <dt className="shrink-0 font-normal text-neutral-400">{field.label}</dt>
                    <dd className="m-0 min-w-0 break-all text-white sm:text-right">
                        {isAddress(field.value) ? <AddressLink address={field.value} /> : field.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
