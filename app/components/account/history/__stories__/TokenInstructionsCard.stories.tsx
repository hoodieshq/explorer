import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseTokenInstructionsCard } from '../BaseTokenInstructionsCard';
import { INSTRUCTION_ROWS, makeRow } from './TokenInstructionsCard.fixtures';

const meta = {
    args: {
        fetching: false,
        foundOldest: false,
        onLoadMore: () => {},
        onRefresh: () => {},
    },
    component: BaseTokenInstructionsCard,
    decorators: [withCluster, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'Instructions that touch a token, as shown on the Instructions tab of a mint. The card takes',
                    'ready rows; `TokenInstructionsCard` loads the history and picks the instructions. It is a table',
                    'on every width: rows lead nowhere on click, so they share one frame split by dividers instead of',
                    'becoming separate cards. Below `md` each row stacks its cells as labelled lines; from `md` up the',
                    'same cells line up as columns under a header row. The status sits as a badge next to the',
                    'signature, so there is no Result column, and the Time column appears only when some row has a',
                    'block time.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) (`collapsible={false}`) — the title row above the table, with the refresh action on the right.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) (`variant="tight"`) — the table frame on every width, recoloured to the transaction tables\' surface (`outer-space-900` background, `outer-space-800` border and row dividers).',
                    '- [RefreshButton](?path=/docs/components-shared-refreshbutton--docs) — the title-row action that re-fetches the history.',
                    '- [Signature](?path=/docs/components-common-signature--docs) (`link`) — the transaction signature, mid-truncated to its cell.',
                    '- [Badge](?path=/docs/components-shared-badge--docs) (`tone="soft"`, `success` / `warning`) — the transaction status next to the signature; it replaces the old Result column.',
                    '- [Timestamp](?path=/docs/components-shared-timestamp--docs) — the block time with the format picker (UTC, local, relative, Unix).',
                    '- [Address](?path=/docs/components-common-address--docs) (`link`) — the program, by name when the explorer knows it, otherwise a mid-truncated key.',
                    '- [HistoryCardFooterContent](?path=/docs/components-account-historycardcomponents--docs) — the footer: Load More, or "Fetched full history" once the oldest page is loaded.',
                    '- [LoadingCard](?path=/docs/components-common-loadingcard--docs) / [ErrorCard](?path=/docs/components-common-errorcard--docs) — not part of this card; `TokenInstructionsCard` renders them before the history arrives.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/History/TokenInstructionsCard',
} satisfies Meta<typeof BaseTokenInstructionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyHistory: Story = {
    args: { foundOldest: true, rows: [] },
};

export const WithInstructions: Story = {
    args: { rows: INSTRUCTION_ROWS },
};

// No row has a block time, so the Time column and the mobile Time pair are gone.
export const WithoutTimestamps: Story = {
    args: { rows: INSTRUCTION_ROWS.map(row => ({ ...row, blockTime: null })) },
};

// One row without a block time among timed rows shows a placeholder in the Time column.
export const MissingTimestamp: Story = {
    args: { rows: [...INSTRUCTION_ROWS.slice(0, 2), makeRow({ blockTime: null, key: 'no-time' })] },
};

export const FullHistory: Story = {
    args: { foundOldest: true, rows: INSTRUCTION_ROWS },
};

export const Fetching: Story = {
    args: { fetching: true, rows: INSTRUCTION_ROWS },
};
