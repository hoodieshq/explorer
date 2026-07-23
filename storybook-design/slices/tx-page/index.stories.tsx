import { nextjsParameters } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { http, HttpResponse } from 'msw';
import React from 'react';

import { ClusterStatusButton } from '@/app/components/ClusterStatusButton';
import { Footer } from '@/app/components/Footer';
import { MessageBanner } from '@/app/components/MessageBanner';
import { Navbar } from '@/app/components/Navbar';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';
import { TransactionDetailsPageClient } from '@/app/tx/[signature]/page-client';
// IMPORTANT: import SearchBar from @features/search, NOT @/app/components/SearchBarLoader.
// SearchBarLoader uses next/dynamic which resolves to an object in Storybook and crashes.
import { SearchBar } from '@features/search';

// Real getMultipleAccounts response for this transaction's account keys (base64-encoded),
// fetched verbatim from mainnet-beta and replayed by MSW so the AccountsCard resolves.
import accountsResult from './accounts-real.json';
import { MockTxPageProviders, SIGNATURE } from './mocks';

const MAINNET_URL = 'https://api.mainnet-beta.solana.com';

// The only live network call on the page is AccountsCard's getMultipleAccountsInfo. Answer that
// with the transaction's real account data; every other RPC method resolves to null (all page
// data already comes from the seeded context providers).
const rpcHandlers = [
    http.post(MAINNET_URL, async ({ request }) => {
        const body = (await request.json()) as { id: number; method: string } | Array<{ id: number; method: string }>;
        const answer = (req: { id: number; method: string }) => ({
            id: req.id,
            jsonrpc: '2.0',
            result: req.method === 'getMultipleAccounts' ? accountsResult : null,
        });
        return HttpResponse.json(Array.isArray(body) ? body.map(answer) : answer(body));
    }),
];

/** Mirrors app/layout.tsx shell exactly (the chrome outside the app providers). */
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

// Renders the REAL transaction page client with the real transaction's data seeded into the
// providers — no reconstruction, no invented layout.
const meta = {
    component: TransactionDetailsPageClient,
    decorators: [
        Story => (
            <MockTxPageProviders>
                <Story />
            </MockTxPageProviders>
        ),
    ],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
        msw: { handlers: rpcHandlers },
    },
    title: 'Design Slices/tx-page',
} satisfies Meta<typeof TransactionDetailsPageClient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <PageShell>
            <TransactionDetailsPageClient params={{ signature: SIGNATURE }} />
        </PageShell>
    ),
};
