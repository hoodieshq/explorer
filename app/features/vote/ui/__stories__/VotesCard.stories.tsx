import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { VotesCard } from '../VotesCard';
import { BASE_SLOT, voteAccountFixture } from './fixtures';

const meta: Meta<typeof VotesCard> = {
    argTypes: {
        layout: {
            control: 'inline-radio',
            description:
                'Inner list rendering. `table` uses the shared `<BaseTable>`; `grid` uses a CSS-grid built from `div`s (desktop-identical, diverges on mobile later).',
            options: ['table', 'grid'],
        },
    },
    component: VotesCard,
    decorators: [withCluster],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'The vote account\'s vote history as a collapsible section — the "Vote History" heading is',
                    'lifted out above the card and a toggle collapses the list. The `layout` prop picks how the',
                    'list renders; everything else is composed from the shared primitives below.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — the shared collapsible wrapper: the heading lifted out above the surface, a `Collapse`/`Expand` toggle, and the height animation. Passed `className=""` so the surface comes from the `<Card>` below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the surface holding the list: a Tailwind `variant="tight"` card for `layout="grid"`, or `ui="dashkit"` for `layout="table"`.',
                    '- [BaseTable](?path=/docs/components-shared-table-basetable--docs) — the `layout="table"` list (the original dashkit surface): a real `<table>` with "Slot" / "Confirmation Count" columns and a "No votes found" empty footer.',
                    '- Vote grid — the `layout="grid"` list: a pure-Tailwind CSS grid (`clamp(132px,25%,200px) 1fr`) built from `div`s with `role="table"`/`row`/`cell` for a11y, mirroring the transaction Accounts/Token Balances tables. Desktop visuals match the table; the internals differ so mobile can diverge later.',
                    '- `Slot` — fills the "Slot" cell, rendering each vote\'s slot as a linked slot number.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/Vote/VotesCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

const votes = Array.from({ length: 6 }, (_, i) => ({
    confirmationCount: 31 - i,
    slot: BASE_SLOT + i,
}));

export const WithVotes: Story = {
    args: {
        voteAccount: voteAccountFixture(votes),
    },
};

export const Empty: Story = {
    args: {
        voteAccount: voteAccountFixture([]),
    },
};

// `layout="grid"` renders the same list as a CSS grid instead of a `<table>`. Desktop visuals match the
// table stories above; the internals differ so mobile can diverge later. Flip the `layout` control.
export const GridLayout: Story = {
    args: {
        layout: 'grid',
        voteAccount: voteAccountFixture(votes),
    },
};
