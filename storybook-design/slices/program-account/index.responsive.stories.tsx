import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import React, { Suspense } from 'react';

import { ClusterStatusButton } from '@/app/components/ClusterStatusButton';
import { Footer } from '@/app/components/Footer';
import { Header } from '@/app/components/Header';
import { MessageBanner } from '@/app/components/MessageBanner';
import { Navbar } from '@/app/components/Navbar';
import { LoadingCard } from '@/app/components/common/LoadingCard';
import { SearchBar } from '@/app/features/search';
import { SecurityNotification } from '@/app/features/security-txt';
import { TransactionHistoryCard } from './TransactionHistoryCard/TransactionHistoryCard';
import { type NavigationTab, NavigationTabs } from '@/app/shared/ui/navigation-tabs';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';
import { StickyHeader } from '@/app/shared/ui/sticky-header/StickyHeader';

import {
    MOCK_PARSED_DATA,
    MOCK_PROGRAM_ACCOUNT,
    MOCK_PROGRAM_ADDRESS,
    MOCK_SECTION_ARGS,
    MockProgramAccountProviders,
    nextjsParameters,
    withMockRpc,
} from './mocks';
import { UpgradeableProgramSection } from './UpgradeableProgramSection/UpgradeableProgramSection';

const programAccountInfo =
    MOCK_SECTION_ARGS.parsedData.type === 'program'
        ? MOCK_SECTION_ARGS.parsedData.info
        : { programData: MOCK_SECTION_ARGS.account.pubkey };

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
                    <div className="mx-auto w-full max-w-[960px]">
                        <SearchBar />
                    </div>
                </PageContainer>
                <PageContainer className="my-3 lg:hidden">
                    <div className="mx-auto w-full max-w-[960px]">
                        <ClusterStatusButton />
                    </div>
                </PageContainer>
                {children}
            </div>
            <Footer />
        </div>
    );
}

const PROGRAM_TABS: NavigationTab[] = [
    { path: '', title: 'History' },
    { path: 'security', title: 'Security' },
    { path: 'verified-build', title: 'Verified Build' },
    { path: 'tokens', title: 'Tokens' },
    { path: 'domains', title: 'Domains' },
    { path: 'idl', title: 'Program IDL' },
];

function PageContent({ address }: { address: string }) {
    const buildHref = React.useCallback((path: string) => `/address/${address}/${path}`, [address]);

    return (
        <PageContainer variant="pulled-up">
            <Suspense fallback={<LoadingCard />}>
                <div className="mx-auto w-full max-w-[960px]">
                    <Header address={address} account={MOCK_PROGRAM_ACCOUNT} isTokenInfoLoading={false} />
                    <UpgradeableProgramSection
                        account={MOCK_SECTION_ARGS.account}
                        programAccount={programAccountInfo}
                        programData={MOCK_SECTION_ARGS.programData}
                    />
                </div>
                <SecurityNotification parsedData={MOCK_PARSED_DATA} address={address} />
                <StickyHeader>
                    <PageContainer>
                        <div className="mx-auto w-full max-w-[960px]">
                            <NavigationTabs buildHref={buildHref} tabs={PROGRAM_TABS} />
                        </div>
                    </PageContainer>
                </StickyHeader>
                <TransactionHistoryCard address={address} />
            </Suspense>
        </PageContainer>
    );
}

const meta = {
    component: PageContent,
    decorators: [
        withMockRpc,
        Story => (
            <MockProgramAccountProviders>
                <Story />
            </MockProgramAccountProviders>
        ),
        withViewportFromGlobal,
    ],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
    },
    title: 'Design Slices/program-account/program-account@Media',
} satisfies Meta<typeof PageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = args => (
    <PageShell>
        <PageContent {...args} />
    </PageShell>
);
const args = { address: MOCK_PROGRAM_ADDRESS };

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
