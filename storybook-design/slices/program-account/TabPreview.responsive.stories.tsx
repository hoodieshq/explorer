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
import { BaseNavigationTabs } from '@/app/shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { type NavigationTab } from '@/app/shared/ui/navigation-tabs';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';
import { StickyHeader } from '@/app/shared/ui/sticky-header/StickyHeader';

import { BaseDomainsCard } from './ProgramTabCards/DomainsCard';
import { ProgramMultisigCard } from './ProgramTabCards/ProgramMultisigCard';
import { ProgramSecurityTxtCard } from './ProgramTabCards/SecurityCard';
import { BaseVerifiedBuildCard } from './ProgramTabCards/VerifiedBuildCard';
import { TransactionHistoryCard } from './TransactionHistoryCard/TransactionHistoryCard';

import {
    MOCK_DOMAINS,
    MOCK_PARSED_DATA,
    MOCK_PROGRAM_ACCOUNT,
    MOCK_PROGRAM_ADDRESS,
    MOCK_SECTION_ARGS,
    MOCK_SECURITY_TXT,
    MOCK_VERIFIED_BUILD,
    nextjsParameters,
    withTabPreviewData,
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
                    <div className="mx-auto w-full max-w-col">
                        <SearchBar />
                    </div>
                </PageContainer>
                <PageContainer className="my-3 lg:hidden">
                    <div className="mx-auto w-full max-w-col">
                        <ClusterStatusButton />
                    </div>
                </PageContainer>
                {children}
            </div>
            <Footer />
        </div>
    );
}

type PreviewPath = '' | 'security' | 'verified-build' | 'program-multisig' | 'domains';

const PREVIEW_TABS: NavigationTab<PreviewPath>[] = [
    { path: '', title: 'History' },
    { path: 'security', title: 'Security' },
    { path: 'verified-build', title: 'Verified Build' },
    { path: 'program-multisig', title: 'Program Multisig' },
    { path: 'domains', title: 'Domains' },
];

function TabPanel({ active, address }: { active: PreviewPath; address: string }) {
    switch (active) {
        case '':
            return <TransactionHistoryCard address={address} />;
        case 'security':
            return (
                <ProgramSecurityTxtCard
                    pmpSecurityTxt={undefined}
                    programAddress={MOCK_PROGRAM_ADDRESS}
                    programDataSecurityTxt={MOCK_SECURITY_TXT}
                />
            );
        case 'verified-build':
            return <BaseVerifiedBuildCard data={MOCK_PARSED_DATA} isLoading={false} registryInfo={MOCK_VERIFIED_BUILD} />;
        case 'program-multisig':
            return <ProgramMultisigCard data={MOCK_PARSED_DATA} />;
        case 'domains':
            return <BaseDomainsCard domains={MOCK_DOMAINS} />;
    }
}

function TabPreviewContent({ address }: { address: string }) {
    const [active, setActive] = React.useState<PreviewPath>('');

    const buildHref = React.useCallback((path: string) => `/address/${address}/${path}`, [address]);
    const onTabClick = React.useCallback((path: string) => setActive(path as PreviewPath), []);

    return (
        <PageContainer variant="pulled-up">
            <Suspense fallback={<LoadingCard />}>
                <div className="mx-auto w-full max-w-col">
                    <Header address={address} account={MOCK_PROGRAM_ACCOUNT} isTokenInfoLoading={false} />
                    <UpgradeableProgramSection
                        account={MOCK_SECTION_ARGS.account}
                        programAccount={programAccountInfo}
                        programData={MOCK_SECTION_ARGS.programData}
                    />
                </div>
                <SecurityNotification parsedData={MOCK_PARSED_DATA} address={address} />
                <StickyHeader className="mb-10 mx-auto w-full max-w-col">
                    <PageContainer>
                        <div className="mx-auto w-full max-w-col">
                            <BaseNavigationTabs
                                tabs={PREVIEW_TABS}
                                activeValue={active}
                                onTabClick={onTabClick}
                                buildHref={buildHref}
                                className="pt-2"
                            />
                        </div>
                    </PageContainer>
                </StickyHeader>
                <div className="mx-auto w-full max-w-col">
                    <TabPanel active={active} address={address} />
                </div>
            </Suspense>
        </PageContainer>
    );
}

const meta = {
    component: TabPreviewContent,
    // withTabPreviewData is self-contained (base RPC stubs + mock getParsedTransaction/
    // getAccountInfo + providers); adding withMockRpc as a sibling races it and blanks
    // the History rows' instructions, so it's intentionally omitted.
    decorators: [
        withTabPreviewData,
        withViewportFromGlobal,
    ],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
    },
    title: 'Design Slices/program-account/Tab Preview@Media',
} satisfies Meta<typeof TabPreviewContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = renderArgs => (
    <PageShell>
        <TabPreviewContent {...renderArgs} />
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
