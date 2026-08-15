import '@/app/styles/styles.css';

import { type Metadata } from 'next/types';
import { type ReactNode } from 'react';

import { Timestamp } from '@/app/components/shared/ui/timestamp';
import { cn } from '@/app/components/shared/utils';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';

import { RelativeBands } from './RelativeBands';

// Unlinked scratch page for eyeballing shared UI primitives in the real app (fonts, tokens,
// portals) without Storybook. Keep it out of search engines and the nav — it's URL-only.
export const metadata: Metadata = {
    robots: { follow: false, index: false },
    title: 'UI Playground | Solana Explorer',
};

// 06:41:51 Aug 06, 2026 (UTC) — same sample used in the Timestamp stories.
const unixTimestamp = 1785998511;

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="mb-12">
            <h2 className="mb-1 text-xl font-semibold text-white">{title}</h2>
            {description && <p className="mb-4 text-sm text-outer-space-300">{description}</p>}
            {children}
        </section>
    );
}

// Mirrors the transaction Overview card rows (app/features/transaction/ui/SummaryCard.tsx).
function OverviewRow({ label, children, divider = true }: { label: string; children: ReactNode; divider?: boolean }) {
    return (
        <div
            className={cn(
                'grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2 px-3 py-2.5 md:px-4',
                divider && 'border-b border-solid border-white/10',
            )}
        >
            <div className="flex flex-wrap items-center gap-1 overflow-hidden text-sm text-outer-space-300">
                {label}
            </div>
            <div className="break-all font-mono text-sm text-white">{children}</div>
        </div>
    );
}

export default function UiPlaygroundPage() {
    return (
        <PageContainer className="my-8 max-w-4xl">
            <h1 className="mb-2 text-4xl font-bold text-white">UI Playground</h1>
            <p className="mb-10 text-gray-400">Click a timestamp to open its dropdown; star a format to pin it.</p>

            <Section title="Timestamp" description="Standalone — opens UTC / Local / Unix, each copyable and pinnable.">
                <Timestamp unixTimestamp={unixTimestamp} />
            </Section>

            <Section
                title="In transaction Overview"
                description="A slice of the transaction Overview card, with the timestamp row in context."
            >
                <div className="max-w-xl overflow-hidden rounded-lg border border-solid border-outer-space-800">
                    <OverviewRow label="Signature">
                        5Nf3xW8pQ7mKd2rBvLhTq9YzJ4cHs6UgAe1oPnR8tXwVbM3kD7yFjZ2uNqW5aCgE9iShL4rT6xUvB1nYmK
                    </OverviewRow>
                    <OverviewRow label="Block">312049876</OverviewRow>
                    <OverviewRow label="Timestamp">
                        <Timestamp unixTimestamp={unixTimestamp} />
                    </OverviewRow>
                    <OverviewRow label="Fee" divider={false}>
                        0.000005 SOL
                    </OverviewRow>
                </div>
            </Section>

            <Section
                title="Relative bands"
                description="One date per band of the relative-time format, so each granularity is visible at once."
            >
                <RelativeBands />
            </Section>
        </PageContainer>
    );
}
