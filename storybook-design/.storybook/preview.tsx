// Standalone preview for storybook-design slices.
// Mirrors .storybook/preview.tsx but omits addon-vitest (not in storybook-design config).
// MSW is always enabled — stories use parameters.msw.handlers for network interception.
import '@/app/styles/styles.css';

import { initialize, mswLoader } from 'msw-storybook-addon';
import React from 'react';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import { rubikFont } from '@/app/styles';

import type { Preview } from '../../.storybook/types';

initialize();

declare global {
    interface BigInt {
        toJSON(): string;
    }
}

BigInt.prototype.toJSON = function () {
    return this.toString();
};

function SelectedBackgroundBridge({ value }: { value?: string }) {
    React.useEffect(() => {
        const root = document.documentElement;
        if (value) root.style.setProperty('--sb-doc-bg', value);
        else root.style.removeProperty('--sb-doc-bg');
    }, [value]);
    return <></>;
}

const preview: Preview = {
    parameters: {
        a11y: {
            config: {
                rules: [
                    { enabled: false, id: 'landmark-one-main' },
                    { enabled: false, id: 'page-has-heading-one' },
                    { enabled: false, id: 'region' },
                ],
            },
            test: 'todo',
        },
        backgrounds: {
            options: {
                dark: { name: 'Dark', value: 'var(--background)' },
                card: { name: 'Card', value: 'var(--sb-bg-card)' },
                light: { name: 'Light', value: 'var(--sb-bg-light)' },
            },
        },
        controls: {
            matchers: {
                // eslint-disable-next-line no-restricted-syntax -- Storybook controls matcher requires regex
                color: /(background|color)$/i,
                // eslint-disable-next-line no-restricted-syntax -- Storybook controls matcher requires regex
                date: /Date$/i,
            },
        },
        layout: 'padded',
        // Bootstrap 5 breakpoint presets — consumed by the breakpoint toolbar.
        // Keys (bsXs … bsXxl) must match the BREAKPOINTS array in .storybook/breakpoint-toolbar.tsx.
        // INITIAL_VIEWPORTS spread included so responsive stories (iphonex, ipad …) resize correctly in story view.
        // NOTE: Storybook 10 reads `options`, not `viewports` — using the wrong key silently falls back to MINIMAL_VIEWPORTS.
        viewport: {
            options: {
                bsLg: { name: 'lg·992', styles: { height: '768px', width: '992px' }, type: 'desktop' },
                bsMd: { name: 'md·768', styles: { height: '1024px', width: '768px' }, type: 'tablet' },
                bsSm: { name: 'sm·576', styles: { height: '812px', width: '576px' }, type: 'mobile' },
                bsXl: { name: 'xl·1200', styles: { height: '900px', width: '1200px' }, type: 'desktop' },
                bsXs: { name: 'xs·375', styles: { height: '667px', width: '375px' }, type: 'mobile' },
                bsXxl: { name: 'xxl·1400', styles: { height: '900px', width: '1400px' }, type: 'desktop' },
                ...INITIAL_VIEWPORTS,
            },
        },
        options: {
            // IMPORTANT: Do NOT add TypeScript type annotations to the (a, b) parameters.
            // Storybook serialises this function as a string and sends it to the browser
            // manager where plain JS is evaluated — TypeScript syntax causes
            // "SyntaxError: Unexpected token ':'" crashing the entire story index.
            storySort: (a, b) => {
                if (a.title === b.title) return 0;
                const ap = a.title.split('/');
                const bp = b.title.split('/');
                for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
                    const as = ap[i] ?? '';
                    const bs = bp[i] ?? '';
                    if (as === bs) continue;
                    if (as === 'Design System') return -1;
                    if (bs === 'Design System') return 1;
                    if (as === 'Responsive') return 1;
                    if (bs === 'Responsive') return -1;
                    return as.localeCompare(bs, undefined, { numeric: true });
                }
                return 0;
            },
        },
    },

    decorators: [
        (Story, context) => {
            const selected = context.globals?.backgrounds?.value;
            const resolved = selected ? context.parameters?.backgrounds?.options?.[selected]?.value : undefined;
            return (
                <>
                    <style>{`:root { --explorer-default-font: ${rubikFont.style.fontFamily}; }`}</style>
                    <SelectedBackgroundBridge value={resolved} />
                    <div id="storybook-outer">
                        <Story />
                    </div>
                </>
            );
        },
    ],

    initialGlobals: {
        backgrounds: {
            value: 'dark',
        },
    },

    loaders: [mswLoader],
};

export default preview;
