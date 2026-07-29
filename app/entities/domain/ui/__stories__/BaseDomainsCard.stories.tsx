import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { BaseDomainsCard } from '../BaseDomainsCard';

const meta = {
    component: BaseDomainsCard,
    decorators: [withClusterAndAccounts, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "Presentational card rendering an account's domains as a collapsible section — the heading",
                    'is lifted out above the card and a toggle collapses the table. This component only supplies',
                    'the copy and the per-row data; everything else is composed from the shared primitives below.',
                    '',
                    '## References',
                    '',
                    '- `<section aria-labelledby>` + `<h2 className="m-0 text-lg font-normal text-white">` — the section heading lifted out above the card, tied to the region via a `useId` id. Mirrors the transaction page\'s `CollapsibleSection`, rebuilt locally because FSD forbids `entity → feature` imports.',
                    '- [Button](?path=/docs/components-shared-button--docs) (`variant="outline" size="sm"`) — the collapse/expand toggle: a rotating `ChevronDown` plus a `Collapse`/`Expand` label on `md+`, with `aria-expanded` reflecting state.',
                    '- Collapse animation — a `grid` wrapper toggling `grid-rows-[1fr]` ↔ `grid-rows-[0fr]` around an `overflow-hidden` child, so the table animates open/closed without fixed heights.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) (`ui="dashkit"`) — the surface holding the table: rounded, bordered, shadowed, with the standard `mb-6` spacing.',
                    '- [BaseTable](?path=/docs/components-shared-table-basetable--docs) (`ui="dashkit" variant="card" nowrap`) — the domain list: `Head`/`HeaderCell` for the "Domain Name" and "Name Service Account" columns, `Body`/`Row`/`Cell` for each domain.',
                    '- [Address](?path=/docs/components-common-address--docs) (`link`) — fills the "Name Service Account" cell, rendering each domain\'s pubkey as a linked, copyable address with a tooltip.',
                    '- [LoadingCard](?path=/docs/components-common-loadingcard--docs) / [ErrorCard](?path=/docs/components-common-errorcard--docs) — not part of this card; rendered by the wrapping `DomainsCard` for the loading and error states.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Entities/Domain/BaseDomainsCard',
} satisfies Meta<typeof BaseDomainsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleDomain: Story = {
    args: {
        domains: [{ address: '5ASxtmcPKDeD8NoE5QpskizPokqDdX1qHFiqZb1spLdo', name: 'example.sol' }],
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('example.sol')).toBeInTheDocument();
    },
};

export const MultipleDomains: Story = {
    args: {
        domains: [
            { address: '5ASxtmcPKDeD8NoE5QpskizPokqDdX1qHFiqZb1spLdo', name: 'example.sol' },
            { address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', name: 'bob.sol' },
            { address: 'Sysvar1111111111111111111111111111111111111', name: 'charlie.ans' },
        ],
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('example.sol')).toBeInTheDocument();
        expect(canvas.getByText('bob.sol')).toBeInTheDocument();
        expect(canvas.getByText('charlie.ans')).toBeInTheDocument();
    },
};
