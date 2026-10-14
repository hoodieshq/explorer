import { cva } from 'class-variance-authority';

/**
 * The yellow marking on a value rendered from a user-supplied IDL: the background only, the text keeps its colour.
 * Sized in `em`, so it scales with the text it marks: an 18px band at 14px, with 4px on each side. `inline-block`,
 * because a marked value can be a block (an address, a decoded value) that an inline background would only edge.
 * Links inside take the brand's light `accent-300`: the 30% yellow over a dark card is olive, where the app's link
 * green reads at 2.35:1 and `accent-300` at 5.4:1.
 */
export const customIdlHighlight = cva('', {
    variants: {
        active: {
            false: '',
            true: 'inline-block rounded-[0.2857em] bg-custom-idl/30 px-[0.2857em] leading-[1.2857em] [&_a:hover]:!text-white [&_a]:!text-accent-300',
        },
    },
});
