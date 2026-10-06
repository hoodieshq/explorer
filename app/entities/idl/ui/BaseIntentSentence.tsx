import { Address } from '@components/common/Address';
import { cn } from '@components/shared/utils';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { displayAddress } from '@utils/tx';
import { cva, type VariantProps } from 'class-variance-authority';

import { shortenAddress, splitIntentSentence } from '../lib/intent-text';

// Size is a variant, not a className override: `cn` keeps both font-size classes and stylesheet order would
// decide. Addresses inherit the size, so they read at the same size as the words around them.
const sentenceVariants = cva('m-0 break-words text-white', {
    defaultVariants: { size: 'base' },
    variants: {
        size: {
            base: 'text-base leading-normal',
            lg: 'text-lg font-medium leading-snug',
            sm: 'text-sm leading-normal',
            xl: 'text-xl font-medium leading-snug',
        },
    },
});

/**
 * An SDK-resolved intent sentence with its addresses rendered by the app's own {@link Address}: link, copy
 * button, and the same cross-page hover highlight as every other address. Known addresses show their label;
 * others are shortened to keep the sentence on one line.
 */
export function BaseIntentSentence({
    sentence,
    size,
    className,
}: { sentence: string; className?: string } & VariantProps<typeof sentenceVariants>) {
    return (
        // A <div>, not a <p>: the addresses inside are `Address` rows, which render block <div>s.
        <div className={cn(sentenceVariants({ size }), className)} data-testid="intent-sentence">
            {/* Index key: the same address can appear twice in one sentence, so values are not unique. */}
            {splitIntentSentence(sentence).map((part, index) =>
                part.kind === 'address' ? (
                    <SentenceAddress key={index} address={part.address} />
                ) : (
                    <span key={index}>{part.text}</span>
                ),
            )}
        </div>
    );
}

function SentenceAddress({ address }: { address: string }) {
    const { cluster } = useCluster();
    // `Address` shows a known label by itself; only a bare address needs the short form.
    const overrideText = displayAddress(address, cluster) === address ? shortenAddress(address) : undefined;

    return (
        // `Address` lays itself out as a full-width row; the inline-block keeps it inside the sentence's flow.
        <span className="inline-block max-w-full align-bottom">
            <Address pubkey={new PublicKey(address)} link noNicknameEditing overrideText={overrideText} />
        </span>
    );
}
