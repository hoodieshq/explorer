import { AddressLink } from '@components/shared/address';
import { cn } from '@components/shared/utils';
import type { Address } from '@solana/kit';

import { splitIntentSentence } from '../lib/intent-text';

const SENTENCE_TRUNCATE = { head: 5, tail: 5 };

/**
 * An SDK-resolved intent sentence with its addresses shortened and linked.
 * The full addresses stay one hop away: in the link title and in the field rows next to the sentence.
 */
export function BaseIntentSentence({ sentence, className }: { sentence: string; className?: string }) {
    return (
        <p
            className={cn('m-0 break-words text-base leading-normal text-white', className)}
            data-testid="intent-sentence"
        >
            {/* Index key: the same address can appear twice in one sentence, so values are not unique. */}
            {splitIntentSentence(sentence).map((part, index) =>
                part.kind === 'address' ? (
                    <AddressLink
                        key={index}
                        address={part.address as Address}
                        truncate={SENTENCE_TRUNCATE}
                        copyable={false}
                    />
                ) : (
                    <span key={index}>{part.text}</span>
                ),
            )}
        </p>
    );
}
