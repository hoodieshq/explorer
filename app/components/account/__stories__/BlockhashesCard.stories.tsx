import { gen } from '@__fixtures__/gen';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BlockhashesCard } from '../BlockhashesCard';

const meta = {
    argTypes: {
        layout: {
            control: 'inline-radio',
            description:
                'Inner list rendering. `table` uses the shared `<BaseTable>`; `grid` uses a CSS-grid built from `div`s that stacks into labelled fields below `md`.',
            options: ['table', 'grid'],
        },
    },
    component: BlockhashesCard,
    parameters: {
        docs: {
            description: {
                component: [
                    'The recent blockhashes stored in the `RecentBlockhashes` sysvar, newest first, with the fee',
                    'each one charged per signature. `layout` picks table vs grid.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — `layout="grid"` only: the "Blockhashes" heading lifted out above the card with the collapse toggle. Passed `className=""` so the surface comes from the `<Card>` below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the card surface: the dashkit card with its "Blockhashes" header and footer for `layout="table"`, a Tailwind `variant="tight"` card for `layout="grid"`.',
                    '- [BaseTable](?path=/docs/components-shared-table-basetable--docs) — the `layout="table"` list (the original dashkit table).',
                    '- Blockhashes grid — the `layout="grid"` list: a pure-Tailwind CSS grid (`clamp(3.5rem,(100% - 2.5rem)*3.5/42.5,5.6rem) minmax(0,26fr) minmax(13rem,13fr)`: the columns grow in proportion to their base widths, Recency up to about 1.6x) built from `div`s on `md+`, labelled Recency / Blockhash / Fee Calculator fields below `md` (the label is a KeyValue-style `clamp(6rem,min(20%,100% - 26.5rem),240px)` band that grows only once the hash fits on one line), mirroring the Rewards card. The blockhash wraps (`break-all`) rather than being truncated.',
                    '- `Copyable` — `layout="grid"` only: the copy glyph in front of each blockhash.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/BlockhashesCard',
} satisfies Meta<typeof BlockhashesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const blockhashes = Array.from({ length: 4 }, (_, i) => ({
    blockhash: gen.blockhash(i),
    feeCalculator: { lamportsPerSignature: '5000' },
}));

export const WithEntries: Story = {
    args: { blockhashes },
};

export const Empty: Story = {
    args: { blockhashes: [] },
};

// `layout="grid"` renders the same entries as a CSS grid instead of a `<table>`.
export const GridLayout: Story = {
    args: { blockhashes, layout: 'grid' },
};

export const GridLayoutEmpty: Story = {
    args: { blockhashes: [], layout: 'grid' },
};
