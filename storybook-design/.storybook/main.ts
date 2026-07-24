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
            // Own PostCSS pipeline for this build. Setting css.postcss explicitly disables Vite's
            // auto-discovery of the root postcss.config.mjs (and therefore the root tailwind.config.ts),
            // so the design work needs no edits to the app's Tailwind/PostCSS setup. tailwindConfig
            // reuses the app theme and only adds slice scanning + the max-w-col utility.
            css: {
                ...config.css,
                postcss: {
                    plugins: [
                        postcssImport(),
                        // Pass the config by PATH (not an imported object): Tailwind's own loader (jiti)
                        // resolves the .ts config and its extensionless `../../tailwind.config` import,
                        // which the Storybook ESM main.ts loader cannot do.
                        tailwindcss({ config: path.resolve(__dirname, './tailwind.config.ts') }),
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
