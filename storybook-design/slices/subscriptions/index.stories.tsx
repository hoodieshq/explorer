import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { ClusterStatusButton } from '@/app/components/ClusterStatusButton';
import { Footer } from '@/app/components/Footer';
import { MessageBanner } from '@/app/components/MessageBanner';
import { Navbar } from '@/app/components/Navbar';
import { SearchBar } from '@/app/features/search';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';
import { BaseNavigationTabs } from '@/app/shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { StickyHeader } from '@/app/shared/ui/sticky-header/StickyHeader';

import { Header } from './Header';
import { OverviewCard } from './OverviewCard';
import { WalletSubscriptionsView } from './WalletSubscriptionsCard';
import { ADDRESS_TABS, ALL_SECTIONS, DEFAULT_PAGE, EMPTY_PAGE, MOCK_ACCOUNT } from './mocks';

// Full `/address/<addr>/subscriptions` page for 8NMTsvBURPYJvzRCmxcudtyXt63zCQb4b2LzdF5S2KZ2 on
// devnet — page chrome (nav, search, footer), account Overview card, the tab bar with Subscriptions
// active, and the tab content. The `Default` story reproduces the live page (real pulled data).

/** Mirrors app/layout.tsx shell exactly. Re-read layout.tsx before each use — it may change. */
function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <div className="min-w-[292px] flex-1 pb-6">
                <Navbar>
                    <SearchBar />
                </Navbar>
                <MessageBanner />
                <PageContainer className="my-3 xl:hidden">
                    <div className="max-w-col mx-auto w-full">
                        <SearchBar />
                    </div>
                </PageContainer>
                <PageContainer className="my-3 lg:hidden">
                    <div className="max-w-col mx-auto w-full">
                        <ClusterStatusButton />
                    </div>
                </PageContainer>
                {children}
            </div>
            <Footer />
        </div>
    );
}

/** Reconstructs app/address/[address]/layout.tsx DetailsSections for a plain wallet with the
 *  Subscriptions tab selected. BaseNavigationTabs is used directly with an explicit activeValue
 *  (the production NavigationTabs derives it from useSelectedLayoutSegment, which Storybook can't mock). */
function PageContent(args: React.ComponentProps<typeof WalletSubscriptionsView>) {
    // The account header, Overview, tab bar, and tab content all share the reference page's
    // `max-w-col` (960) reading column (matching program-account's Header+section wrapper), as do the
    // shell's mobile search + cluster blocks. The outer PageContainer is `!max-w-none` (full width,
    // px-3 gutter only) so those inner `max-w-col` wrappers own the column width. The tab bar can't
    // just reuse the content wrapper: StickyHeader wraps its children in a `-mx-3` full-bleed div (so
    // the sticky bar spans edge-to-edge), which cancels the page gutter. We restore it with `px-3` and
    // then center on the same `max-w-col` column — that keeps the first tab edge-aligned with the
    // section titles at every width (12px gutter on mobile, 960 centered on desktop). `NavigationTabs`
    // is swapped for `BaseNavigationTabs` with an explicit `activeValue`, since Storybook can't mock
    // `useSelectedLayoutSegment`.
    return (
        <PageContainer variant="pulled-up" className="!max-w-none">
            <div className="max-w-col mx-auto w-full">
                <Header />
                <OverviewCard account={MOCK_ACCOUNT} />
            </div>
            <StickyHeader>
                <div className="px-3">
                    <div className="max-w-col mx-auto w-full">
                        <BaseNavigationTabs
                            activeValue="subscriptions"
                            buildHref={path => `#${path}`}
                            onSelectChange={() => undefined}
                            tabs={ADDRESS_TABS}
                        />
                    </div>
                </div>
            </StickyHeader>
            <div className="max-w-col mx-auto w-full">
                <WalletSubscriptionsView {...args} />
            </div>
        </PageContainer>
    );
}

const meta = {
    component: PageContent,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
    },
    title: 'Design Slices/subscriptions/default',
} satisfies Meta<typeof PageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = args => (
    <PageShell>
        <PageContent {...args} />
    </PageShell>
);

/** The page exactly as it renders live (real pulled data). */
export const Default: Story = {
    args: DEFAULT_PAGE,
    render,
};

/** Every block populated at once — for reviewing the full composition. */
export const AllSections: Story = {
    args: ALL_SECTIONS,
    render,
};

/** Empty state — no subscriptions for this address. */
export const Empty: Story = {
    args: EMPTY_PAGE,
    render,
};
