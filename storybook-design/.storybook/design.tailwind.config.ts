import type { Config } from 'tailwindcss';

import rootConfig from '../../tailwind.config';

// Design-Storybook Tailwind config: identical to the shared root config, but its content glob
// also scans `storybook-design/**` so arbitrary-value utilities used only in the design slices
// and their vendored components (grid-template-areas, `max-w-[960px]`, custom grid-cols, …) get
// generated. The root config intentionally scans only `./app/**` and is left untouched.
const config: Config = {
    ...rootConfig,
    content: ['./app/**/*.{ts,tsx}', './storybook-design/**/*.{ts,tsx}'],
};

export default config;
