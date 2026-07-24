import '@/app/styles/styles.css';

import { createPreview } from '../../.storybook/create-preview';

// MSW is always enabled — stories use parameters.msw.handlers for network interception.
const preview = createPreview({ mswEnabled: true });

// Pin the full-page `default` entity (and its @Media companion) to the top of each slice folder,
// then fall back to alphabetical with `Design System` first and `Responsive` last. Self-contained
// on purpose — Storybook stringifies this function, so it may not reference outer scope.
export default {
    ...preview,
    parameters: {
        ...preview.parameters,
        options: {
            ...preview.parameters?.options,
            storySort: (a, b) => {
                const rank = title => {
                    const last = title.split('/').pop() ?? '';
                    if (last === 'default') return 0;
                    if (last === 'default@Media') return 1;
                    return 2;
                };
                const ra = rank(a.title);
                const rb = rank(b.title);
                if (ra !== rb) return ra - rb;
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
};
