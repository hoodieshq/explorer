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
import { TransactionInspectorPageEnhancements } from '../../vendor/components/inspector/InspectorPageEnhancements';
import { TransactionInspectorPageMatchToTxView } from '../../vendor/components/inspector/InspectorPageMatchToTxView';
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

/** Enhancements copy of the page body — renders its own isolated composition
 *  (InspectorPageEnhancements) so design changes here never affect the Default story. */
function PageContentEnhancements({ signature }: { signature: string }) {
    return <TransactionInspectorPageEnhancements signature={signature} showTokenBalanceChanges={false} />;
}

/** Match to TX view copy of the page body — renders its own isolated composition
 *  (InspectorPageMatchToTxView) so design changes here never affect Default or Enhancements. */
function PageContentMatchToTxView({ signature }: { signature: string }) {
    return <TransactionInspectorPageMatchToTxView signature={signature} showTokenBalanceChanges={false} />;
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

/** Independent copy of the page for iterating on design enhancements. It renders its own composition
 *  root (InspectorPageEnhancements), so changes made here never affect Default. To enhance a section,
 *  add a `*.enhancements.tsx` variant next to the vendor component and wire it into
 *  InspectorPageEnhancements — Default keeps using the originals. */
export const Enhancements: Story = {
    args: { signature: SIGNATURE },
    render: args => (
        <PageShell>
            <PageContentEnhancements {...args} />
        </PageShell>
    ),
};

/** Independent copy of the page for iterating the design toward the transaction details (TX) view.
 *  It renders its own composition root (InspectorPageMatchToTxView), so changes made here never affect
 *  Default or Enhancements. To change a section only here, add a `*.match-to-tx-view.tsx` variant next
 *  to the vendor component and wire it into InspectorPageMatchToTxView — the other stories keep using
 *  their own originals. */
export const Match_to_TX_view: Story = {
    args: { signature: SIGNATURE },
    render: args => (
        <PageShell>
            <PageContentMatchToTxView {...args} />
        </PageShell>
    ),
};
