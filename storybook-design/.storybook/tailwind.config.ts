import type { Config } from 'tailwindcss';

import base from '../../tailwind.config';

// Self-contained Tailwind config for the design-prototype Storybook build.
//
// It reuses the app's real theme (root tailwind.config.ts) verbatim and adds only what the
// slices need on top of it:
//   1. `content` also scans `storybook-design/**` so classes used only inside a slice
//      (e.g. arbitrary widths) are generated.
//   2. `maxW-col` — a named column-width cap used by the slices.
//
// It is wired into the design-sb build via `css.postcss` in main.ts, which means the root
// tailwind.config.ts / postcss.config.mjs stay completely untouched by the design work.
const config: Config = {
    ...base,
    content: ['./app/**/*.{ts,tsx}', './storybook-design/**/*.{ts,tsx}'],
    theme: {
        ...base.theme,
        extend: {
            ...base.theme?.extend,
            maxWidth: {
                ...base.theme?.extend?.maxWidth,
                // Named column-width cap for constraining content column width. Pair with
                // `mx-auto w-full` to center.
                col: '960px',
            },
        },
    },
};

export default config;
