import { withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
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
import { ADDRESS_TABS, DEFAULT_PAGE, MOCK_ACCOUNT } from './mocks';

// Same full page as index.stories.tsx, pinned at three viewports.

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

function PageContent(args: React.ComponentProps<typeof WalletSubscriptionsView>) {
    return (
        <PageContainer variant="pulled-up" className="!max-w-none">
            <div className="max-w-col mx-auto w-full">
                <Header />
                <OverviewCard account={MOCK_ACCOUNT} />
            </div>
            <StickyHeader>
                {/* StickyHeader wraps children in a `-mx-3` full-bleed div; restore the gutter with
                    px-3 and center on the same `max-w-col` column the content blocks use, so the tab
                    bar stays edge-aligned with them (12px gutter on mobile, 960 centered on desktop). */}
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
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch, withViewportFromGlobal],
    parameters: { layout: 'fullscreen' },
    title: 'Design Slices/subscriptions/default@Media',
} satisfies Meta<typeof PageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = args => (
    <PageShell>
        <PageContent {...args} />
    </PageShell>
);
const args = DEFAULT_PAGE;

export const Mobile: Story = {
    args,
    globals: { viewport: { value: 'iphonex' } },
    render,
};

export const TabletPortrait: Story = {
    args,
    globals: { viewport: { value: 'ipad' } },
    render,
};

export const TabletLandscape: Story = {
    args,
    globals: { viewport: { isRotated: true, value: 'ipad' } },
    render,
};
