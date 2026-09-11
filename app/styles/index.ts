import { Roboto_Mono, Rubik } from 'next/font/google';

export const rubikFont = Rubik({
    display: 'swap',
    subsets: ['latin'],
    variable: '--explorer-default-font',
    weight: ['300', '400', '700'],
});

// The mono face of the product: addresses, signatures, amounts and every other
// figure meant to be compared character by character. It is the same family the
// receipt PDF embeds (public/fonts/RobotoMono-*.ttf) and the same one the OG
// designs are drawn in — before this, `font-mono` fell through to whatever the
// operating system called monospace, so the same address rendered in SF Mono on
// a Mac and Consolas on Windows.
export const robotoMonoFont = Roboto_Mono({
    display: 'swap',
    subsets: ['latin'],
    variable: '--explorer-mono-font',
    weight: ['400', '500'],
});
