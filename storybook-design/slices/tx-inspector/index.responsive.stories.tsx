import { SearchBar } from '@features/search';
import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { ClusterStatusButton } from '@/app/components/ClusterStatusButton';
import { Footer } from '@/app/components/Footer';
import { MessageBanner } from '@/app/components/MessageBanner';
import { Navbar } from '@/app/components/Navbar';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';

import { TransactionInspectorPage } from '../../vendor/components/inspector/InspectorPage';
import { DEFAULT_HANDLERS, MockInspectorProviders, nextjsParameters, SIGNATURE } from './mocks';

/** Mirrors app/layout.tsx shell exactly. */
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

function PageContent({ signature }: { signature: string }) {
    return <TransactionInspectorPage signature={signature} showTokenBalanceChanges={false} />;
}

const meta = {
    component: PageContent,
    decorators: [
        Story => (
            <MockInspectorProviders>
                <Story />
            </MockInspectorProviders>
        ),
        withViewportFromGlobal,
    ],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
        msw: { handlers: DEFAULT_HANDLERS },
    },
    title: 'Design Slices/tx-inspector/tx-inspector@Media',
} satisfies Meta<typeof PageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = args => (
    <PageShell>
        <PageContent {...args} />
    </PageShell>
);
const args = { signature: SIGNATURE };

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
