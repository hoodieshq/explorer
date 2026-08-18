import type { Meta, StoryObj } from '@storybook-config/types';
import type { ReactNode } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';

import { cn } from '@/app/components/shared/utils';
import { RelativeBands } from '@/app/ui/RelativeBands';

import { Timestamp } from './timestamp';
import { setPinnedTimestampDisplay } from './useTimestampDisplay';

// 06:41:51 Aug 06, 2026 (UTC) — the values from the reference design.
const unixTimestamp = 1785998511;

const meta: Meta<typeof Timestamp> = {
    argTypes: {
        display: { control: 'inline-radio', options: ['relative', 'local', 'utc', 'unix'] },
        unixTimestamp: { control: 'number' },
    },
    // The pinned representation is shared, persisted state — reset it so stories don't leak into each other.
    beforeEach: () => {
        setPinnedTimestampDisplay(undefined);
    },
    component: Timestamp,
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/Timestamp',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { unixTimestamp },
};

// Opens the dropdown and asserts the three copyable rows are present.
export const OpenDropdown: Story = {
    args: { unixTimestamp },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        // PopoverContent portals to document.body, so query the screen rather than the canvas.
        expect(await screen.findByText('UTC')).toBeInTheDocument();
        expect(screen.getByText('Local')).toBeInTheDocument();
        expect(screen.getByText('Unix Timestamp')).toBeInTheDocument();
        expect(screen.getByText(String(unixTimestamp))).toBeInTheDocument();
    },
};

// A faithful slice of the transaction Overview card (app/features/transaction/ui/SummaryCard.tsx):
// same responsive grid rows, with the two legacy "Timestamp (Local)" / "Timestamp (UTC)" rows
// collapsed into a single clickable Timestamp. Rendered here to check the fit — especially on mobile.
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

function TransactionOverviewSlice({ unixTimestamp: ts }: { unixTimestamp: number }) {
    return (
        <div className="max-w-xl overflow-hidden rounded-lg border border-solid border-outer-space-800">
            <OverviewRow label="Signature">
                5Nf3xW8pQ7mKd2rBvLhTq9YzJ4cHs6UgAe1oPnR8tXwVbM3kD7yFjZ2uNqW5aCgE9iShL4rT6xUvB1nYmK
            </OverviewRow>
            <OverviewRow label="Block">312049876</OverviewRow>
            <OverviewRow label="Timestamp">
                <Timestamp unixTimestamp={ts} />
            </OverviewRow>
            <OverviewRow label="Fee" divider={false}>
                0.000005 SOL
            </OverviewRow>
        </div>
    );
}

// How the component sits inside the transaction Overview table.
export const InTransactionOverview: Story = {
    args: { unixTimestamp },
    render: ({ unixTimestamp: ts }) => <TransactionOverviewSlice unixTimestamp={ts} />,
};

// One date per relative-time band, so every granularity (seconds … years) is visible at once.
export const RelativeTimeBands: Story = {
    render: () => <RelativeBands />,
};
