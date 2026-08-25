import type { Meta, StoryObj } from '@storybook-config/types';

import { type NavigationTab } from '@/app/shared/ui/navigation-tabs/model/types';
import { BaseNavigationTabs } from '@/app/shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';
import { StickyHeader } from '@/app/shared/ui/sticky-header/StickyHeader';

const meta: Meta<typeof StickyHeader> = {
    component: StickyHeader,
    parameters: {
        docs: {
            description: {
                component: [
                    "Sticky, full-bleed bar for a page's primary tab navigation (address & block page tabs). It",
                    'stretches its background edge-to-edge, keeps the tabs on the page content column, draws the',
                    'section underline, and publishes its height to `--sticky-header-height` for anchored content.',
                    '',
                    '## How to embed it',
                    '',
                    'Render `StickyHeader` as a **direct child of the page content column** — the same',
                    'max-width/padding wrapper that holds the page body (dashkit `PageContainer`, the DSCOMMON',
                    'content column, …). Pass the tabs **directly**; do not wrap them in another column container,',
                    'and do not place the bar at full page width.',
                    '',
                    '```tsx',
                    '<PageContentColumn>',
                    '    <StickyHeader className="mb-8">',
                    '        <NavigationTabs … />   {/* tabs only — no inner column wrapper */}',
                    '    </StickyHeader>',
                    '    {/* … page body … */}',
                    '</PageContentColumn>',
                    '```',
                    '',
                    'Why placement matters: the bar goes full-bleed with `ml/mr-[calc(50%-50vw)]` and pulls the tabs',
                    'back with matching `pl/pr-[calc(50vw-50%)]`. Those `50%` values resolve against the **parent**',
                    'width, so the pull-back only aligns the tabs with the body when the parent IS the content',
                    'column. This lets one component adapt to any column system (no hardcoded width) — but placed',
                    'anywhere else the tabs will not line up with the content below, and a nested column wrapper',
                    'would double-constrain them.',
                    '',
                    '## Underline & spacing',
                    '',
                    '- Underline (`border-b`) is full-bleed into the page margins on mobile/tablet and clipped to',
                    '  the content column at `lg` (desktop).',
                    '- The component adds **no** bottom spacing of its own — pass it via `className` (e.g. `mb-8`).',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/StickyHeader',
};

export default meta;
type Story = StoryObj<typeof meta>;

const TABS: NavigationTab[] = [
    { path: '', title: 'Transactions' },
    { path: 'rewards', title: 'Rewards' },
    { path: 'programs', title: 'Programs' },
    { path: 'accounts', title: 'Accounts' },
];

const buildHref = (path: string) => `#${path}`;

// The `PageContainer` decorator stands in for the page content column: `StickyHeader` is its direct
// child, so the full-bleed pull-back lines the tabs up with the (would-be) page body below.
export const Default: Story = {
    decorators: [
        Story => (
            <PageContainer style={{ height: 200 }} className="relative overflow-auto">
                <Story />
                <div style={{ height: 600, paddingTop: 16 }}>
                    <p className="text-sm text-neutral-400">Scroll down to see the sticky behavior.</p>
                </div>
            </PageContainer>
        ),
    ],
    render: () => (
        <StickyHeader className="mb-8">
            <BaseNavigationTabs activeValue="" buildHref={buildHref} tabs={TABS} onSelectChange={() => {}} />
        </StickyHeader>
    ),
};
