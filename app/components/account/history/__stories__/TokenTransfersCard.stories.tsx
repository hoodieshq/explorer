import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseTokenTransfersCard } from '../BaseTokenTransfersCard';
import { TRANSFER_ROWS, transferRow } from './TokenTransfersCard.fixtures';

const meta = {
    args: {
        fetching: false,
        foundOldest: false,
        onLoadMore: () => {},
        onRefresh: () => {},
    },
    component: BaseTokenTransfersCard,
    decorators: [withCluster],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'Token transfers of a mint, as shown on the Transfers tab of the address page. The card takes',
                    'ready rows; `TokenTransfersCard` loads the history, collects the transfers and computes the',
                    'amounts. It is one table on every width: below `lg` each row is a stack of labelled lines,',
                    'from `lg` up the same cells line up as columns under a header row. Rows open nothing on tap, so',
                    'they stay table rows rather than the per-row cards used for clickable rows.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) (`collapsible={false}`, `className=""`) — the title above the table with the refresh action; the surface comes from the Card below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) (`variant="tight"`) — the table frame, styled like the Domains tab table: `outer-space-900` fill, `outer-space-800` border and row separators.',
                    '- Table grid — `div`s with ARIA table roles; a shared `lg:` column track keeps the header and rows aligned.',
                    '- [RefreshButton](?path=/docs/components-shared-refreshbutton--docs) — the title-row action that re-fetches the history.',
                    '- [Signature](?path=/docs/components-common-signature--docs) (`link`) — the transaction signature, mid-truncated to its cell.',
                    '- [Badge](?path=/docs/components-shared-badge--docs) (`tone="soft"`, `success` / `warning`) — the transaction status next to the signature; it replaces the old Result column.',
                    '- [Timestamp](?path=/docs/components-shared-timestamp--docs) — the block time with the format picker (UTC, local, relative, Unix).',
                    '- [Address](?path=/docs/components-common-address--docs) (`link`) — Source and Destination. On mobile each gets its own line and mid-truncates to it.',
                    "- [Skeleton](?path=/docs/components-shared-skeleton--docs) — holds the token symbol's place while the token info loads.",
                    '- ScaledUiAmountMultiplierTooltip (no story) — the info icon after the amount when the mint has a scaled UI amount multiplier; built on [Tooltip](?path=/docs/components-shared-tooltip--docs).',
                    '- [HistoryCardFooterContent](?path=/docs/components-account-historycardcomponents--docs) — the footer: Load More, or "Fetched full history" once the oldest page is loaded.',
                    '- [LoadingCard](?path=/docs/components-common-loadingcard--docs) / [ErrorCard](?path=/docs/components-common-errorcard--docs) — not part of this card; `TokenTransfersCard` renders them before the history arrives.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/History/TokenTransfersCard',
} satisfies Meta<typeof BaseTokenTransfersCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Includes a failed transfer and a transfer without a block time.
export const WithTransfers: Story = {
    args: { rows: TRANSFER_ROWS },
};

// No block times, so the Time column is left out.
export const WithoutTimestamps: Story = {
    args: { rows: [transferRow(1, { blockTime: undefined }), transferRow(2, { blockTime: undefined })] },
};

// The token info is still loading, so the symbol shows as a placeholder.
export const LoadingSymbol: Story = {
    args: { rows: [transferRow(1, { units: undefined }), transferRow(2, { units: undefined })] },
};

export const ScaledUiAmount: Story = {
    args: {
        rows: [transferRow(1, { amount: '2500', rawAmount: '1,250.000000', scaledUiAmountMultiplier: '2' })],
    },
};

export const FullHistory: Story = {
    args: { foundOldest: true, rows: TRANSFER_ROWS },
};

export const EmptyHistory: Story = {
    args: { foundOldest: true, rows: [] },
};

export const Fetching: Story = {
    args: { fetching: true, rows: TRANSFER_ROWS },
};
