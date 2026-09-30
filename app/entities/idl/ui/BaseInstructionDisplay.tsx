import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { Address } from '@components/common/Address';
import { cn } from '@components/shared/utils';
import { KeyValue } from '@shared/ui/key-value';
import { isAddress } from '@solana/kit';
import { PublicKey } from '@solana/web3.js';

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

/**
 * Label/value rows of the display's fallback list, laid out as the Overview card's rows ({@link KeyValue}),
 * top-left aligned so a long value wraps under its own start. Addresses use the app's {@link Address}.
 */
export function BaseDisplayFields({ fields, className }: { fields: InstructionDisplay['fields']; className?: string }) {
    return (
        // The rhythm of an account's expanded details (AccountExpandedContent): `flat` rows, 6px apart.
        <div className={cn('flex flex-col gap-1.5', className)} data-testid="intent-fields">
            {/* Index key: an argument and an account can share a name, so labels are not unique. */}
            {fields.map((field, index) => (
                <KeyValue key={index} label={field.label} align="start" density="flat" divider={false}>
                    {isAddress(field.value) ? (
                        <Address pubkey={new PublicKey(field.value)} link noNicknameEditing />
                    ) : (
                        <span className="text-white">{field.value}</span>
                    )}
                </KeyValue>
            ))}
        </div>
    );
}
