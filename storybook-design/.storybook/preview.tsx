import '@/app/styles/styles.css';

import { createPreview } from '../../.storybook/create-preview';
import type { Preview } from '../../.storybook/types';

// MSW is always enabled — stories use parameters.msw.handlers for network interception.
const preview = createPreview({ mswEnabled: true });

// Pin the composed full-page slice ('Design Slices/tx-inspector' → Default) to the very
// top of the sidebar, above the per-component card stories. Everything else keeps the
// shared ordering (Design System groups first, Responsive/@Media groups last, otherwise
// alphabetical). Must be self-contained — Storybook stringifies this function.
const designPreview: Preview = {
    ...preview,
    parameters: {
        ...preview.parameters,
        options: {
            ...preview.parameters?.options,
            storySort: (a, b) => {
                const PAGE = 'Design Slices/tx-inspector';
                if (a.title === PAGE && b.title === PAGE) return 0;
                if (a.title === PAGE) return -1;
                if (b.title === PAGE) return 1;

                if (a.title === b.title) return 0; // keep story definition order within a file
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
};

export default designPreview;
