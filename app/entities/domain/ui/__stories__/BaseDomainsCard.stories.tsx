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
                    "Presentational card rendering an account's domains. Its look is composed entirely",
                    'from the shared design-system primitives listed below — this component only supplies',
                    'the copy and the per-row data.',
                    '',
                    '## References',
                    '',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) (`ui="dashkit"`) — the outer container that now holds only the table: rounded, bordered, shadowed surface with the standard `mb-6` spacing.',
                    '- [CardHeader](?path=/docs/components-shared-card-basecard--docs) (`placement="section"`) — the section heading lifted out above the card, styled with pure Tailwind (no dashkit `dk-*` tokens, so no `ui` needed): no divider, no fixed height (hugs its content), no padding, with a 12px (`mb-3`) gap down to the card; stretches its first child full-width.',
                    '- [CardTitle](?path=/docs/components-shared-card-basecard--docs) (`as="h3" ui="dashkit"`) — renders the "Owned Domain Names" heading; the `section` header sizes it to `text-lg`.',
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
