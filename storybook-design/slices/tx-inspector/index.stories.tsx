// IMPORTANT: import SearchBar from @features/search, NOT from @/app/components/SearchBarLoader.
// SearchBarLoader uses next/dynamic which resolves to an object in Storybook.
import { SearchBar } from '@features/search';
import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { ClusterStatusButton } from '@/app/components/ClusterStatusButton';
import { Footer } from '@/app/components/Footer';
import { MessageBanner } from '@/app/components/MessageBanner';
import { Navbar } from '@/app/components/Navbar';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';

import { TransactionInspectorPage } from '../../vendor/components/inspector/InspectorPage';
import { DEFAULT_HANDLERS, nextjsParameters, SIGNATURE, withInspectorProviders } from './mocks';

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
                    <SearchBar />
                </PageContainer>
                <PageContainer className="my-3 lg:hidden">
                    <ClusterStatusButton />
                </PageContainer>
                {children}
            </div>
            <Footer />
        </div>
    );
}

/** Reconstructs app/tx/(inspector)/[signature]/inspect/page-client.tsx — the whole page body
 *  is TransactionInspectorPage rendered in signature (permalink) mode. */
function PageContent({ signature }: { signature: string }) {
    return <TransactionInspectorPage signature={signature} showTokenBalanceChanges={false} />;
}

const meta = {
    component: PageContent,
    decorators: [withInspectorProviders],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
        msw: { handlers: DEFAULT_HANDLERS },
    },
    title: 'Design Slices/tx-inspector',
} satisfies Meta<typeof PageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { signature: SIGNATURE },
    render: args => (
        <PageShell>
            <PageContent {...args} />
        </PageShell>
    ),
};
