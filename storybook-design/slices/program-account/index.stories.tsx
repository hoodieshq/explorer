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
    nextjsParameters,
    withEmptyHistoryProviders,
    withInstructionData,
    withMockProviders,
    withMockRpc,
} from './mocks';
import { UpgradeableProgramSection } from './UpgradeableProgramSection/UpgradeableProgramSection';

// MOCK_SECTION_ARGS.parsedData is always the `program` variant in this fixture.
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

// Navigation tabs a program account surfaces (getNavigationTabs in address/[address]/layout.tsx):
// History + bpf-upgradeable-loader (Security, Verified Build) + Tokens/Domains + executable (Program IDL).
const PROGRAM_TABS: NavigationTab[] = [
    { path: '', title: 'History' },
    { path: 'security', title: 'Security' },
    { path: 'verified-build', title: 'Verified Build' },
    { path: 'tokens', title: 'Tokens' },
    { path: 'domains', title: 'Domains' },
    { path: 'idl', title: 'Program IDL' },
];

/** Reconstructs the /address/[address] layout content for a program account. */
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
    // withMockRpc first (safe RPC stubs); per-story decorators supply the providers.
    decorators: [withMockRpc],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
    },
    title: 'Design Slices/program-account',
} satisfies Meta<typeof PageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { address: MOCK_PROGRAM_ADDRESS };

// Data rendered throughout, including the TransactionHistoryCard instruction parameters
// (withInstructionData adds a VisibilityProvider + getParsedTransaction stub).
export const Default: Story = {
    args,
    decorators: [withInstructionData],
    render: renderArgs => (
        <PageShell>
            <PageContent {...renderArgs} />
        </PageShell>
    ),
};

// Same page, but the History card's instruction parameters stay on their skeleton.
export const ParametersLoading: Story = {
    args,
    decorators: [withMockProviders],
    render: renderArgs => (
        <PageShell>
            <PageContent {...renderArgs} />
        </PageShell>
    ),
};

export const EmptyHistory: Story = {
    args,
    decorators: [withEmptyHistoryProviders],
    render: renderArgs => (
        <PageShell>
            <PageContent {...renderArgs} />
        </PageShell>
    ),
};

// Account-fetch stage: the real DetailsSections renders a LoadingCard while the
// account (and token info) resolve, before any section paints.
export const Loading: Story = {
    args,
    render: () => (
        <PageShell>
            <PageContainer variant="pulled-up">
                <LoadingCard />
            </PageContainer>
        </PageShell>
    ),
};
