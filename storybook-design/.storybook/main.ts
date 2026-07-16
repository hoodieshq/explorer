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

// ---------------------------------------------------------------------------
// Vendored design components.
//
// The design work modifies a handful of shared app/ components. To keep app/ pristine while
// the slices still render the redesigned versions, the modified files are copied verbatim into
// `../vendor/` (mirroring their app-relative paths) and app/ is reverted to its pre-branch state.
//
// This plugin makes the copies win. It resolves every import normally, then — if the resolved
// file is one of the modified originals — swaps it for the vendored copy. Because it keys off the
// RESOLVED absolute path, it catches every specifier form (relative, `@/app/...`, tsconfig short
// aliases like `@components/...`, and barrel re-exports), including transitive imports made by
// other, unmodified app components that a slice pulls in. That is something a specifier-level
// Vite alias cannot do.
const VENDORED_RELPATHS = [
    'components/Header.tsx',
    'components/shared/HexData.tsx',
    'components/shared/ui/badge.tsx',
    'components/shared/ui/refresh-button.tsx',
    'shared/components/DownloadDropdown.tsx',
    'shared/ui/Alert/Alert.tsx',
    'shared/ui/Card/BaseCard.tsx',
    'shared/ui/navigation-tabs/ui/BaseNavigationTabs.tsx',
    'shared/ui/navigation-tabs/ui/NavigationTabs.tsx',
    'shared/ui/navigation-tabs/ui/MobileMoreDropdown.tsx',
    'shared/ui/page-container/PageContainer.tsx',
    'shared/ui/sticky-header/StickyHeader.tsx',
];

const APP_ROOT = path.resolve(__dirname, '../../app');
const VENDOR_ROOT = path.resolve(__dirname, '../vendor');
const VENDOR_MAP = new Map(
    VENDORED_RELPATHS.map(rel => [path.join(APP_ROOT, rel), path.join(VENDOR_ROOT, rel)]),
);

function redirectVendoredPlugin() {
    return {
        name: 'design-slice:redirect-vendored',
        enforce: 'pre' as const,
        async resolveId(this: any, source: string, importer: string | undefined, options: any) {
            // Let the rest of the pipeline resolve to a real path first (skipSelf avoids recursion).
            const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
            if (!resolved) return null;
            const cleanId = resolved.id.split('?')[0];
            const vendored = VENDOR_MAP.get(cleanId);
            return vendored ? { ...resolved, id: vendored } : null;
        },
    };
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
            // reuses the app theme and only adds slice scanning + the maxW-col utility.
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
                redirectVendoredPlugin(),
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
