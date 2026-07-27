import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/nextjs-vite';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import type { AliasOptions } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The root tailwind.config.ts scans only `./app/**`, so arbitrary-value utilities that live
// *only* in storybook-design (e.g. the `AccountsCard` grid-template-areas, `max-w-[960px]`)
// are never generated — the classes land in the DOM with no matching CSS and layouts collapse.
// `design.tailwind.config.ts` extends the root config with a content glob that also covers
// storybook-design; Tailwind's own loader resolves it (it handles .ts). We point PostCSS at it
// only for the design Storybook build, without touching the shared root config. (Setting
// `css.postcss` inline makes Vite ignore the file-based postcss.config.mjs, so we re-declare its
// plugins here too.)
const designTailwindConfigPath = path.resolve(__dirname, 'design.tailwind.config.ts');

function toAliasArray(alias: AliasOptions | undefined) {
    if (Array.isArray(alias)) return alias;
    return Object.entries(alias ?? {}).map(([find, replacement]) => ({ find, replacement }));
}

const config: StorybookConfig = {
    stories: ['../slices/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
    core: { disableTelemetry: true },
    framework: { name: '@storybook/nextjs-vite', options: {} },
    staticDirs: ['../../public'],
    async viteFinal(config) {
        return {
            ...config,
            css: {
                ...config.css,
                postcss: {
                    plugins: [
                        postcssImport(),
                        tailwindcss(designTailwindConfigPath),
                        autoprefixer({ ignoreUnknownVersions: true }),
                    ],
                },
            },
            plugins: [
                ...(config.plugins ?? []),
                nodePolyfills({
                    globals: { Buffer: true, global: true, process: true },
                    include: ['path', 'stream', 'util', 'buffer'],
                }),
            ],
            resolve: {
                ...config.resolve,
                alias: [
                    ...toAliasArray(config.resolve?.alias),
                    {
                        find: '@bundlr-network/client',
                        replacement: path.resolve(__dirname, '../../.storybook/__mocks__/@bundlr-network/client.ts'),
                    },
                    {
                        // nftoken-hooks is imported as './nftoken-hooks' from several files, with
                        // and without the extension — a relative specifier vite can only alias by
                        // regex.
                        // eslint-disable-next-line no-restricted-syntax -- see above
                        find: /^\.\/nftoken-hooks(?:\.tsx?)?$/,
                        replacement: path.resolve(__dirname, '../../.storybook/__mocks__/nftoken-hooks.tsx'),
                    },
                    {
                        find: '@storybook-config',
                        replacement: path.resolve(__dirname, '../../.storybook'),
                    },
                    {
                        find: '@/app',
                        replacement: path.resolve(__dirname, '../../app'),
                    },
                ],
            },
        };
    },
};

export default config;
