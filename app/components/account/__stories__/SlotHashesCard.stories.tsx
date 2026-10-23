import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import type { SysvarSlotHashesAccount } from '@/app/validators/accounts/sysvar';

import { SlotHashesCard } from '../SlotHashesCard';

const meta: Meta<typeof SlotHashesCard> = {
    component: SlotHashesCard,
    decorators: [withCluster],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'The Slot Hashes sysvar as a list of recent slots and their bank hashes, in a collapsible',
                    'section. Everything is composed from the shared primitives below.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — the "Slot Hashes" heading lifted out above the surface, a `Collapse`/`Expand` toggle, and the height animation. Passed `className=""` so the surface comes from the `<Card>` below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the Tailwind `variant="tight"` surface holding the list.',
                    '- Slot hashes grid — a pure-Tailwind CSS grid (`clamp(132px,25%,200px) 1fr`) built from `div`s with `role="table"`/`row`/`cell` for a11y, mirroring the Vote History grid. The hash wraps (`break-all`) on narrow screens, so the page never scrolls horizontally.',
                    '- `Slot` — fills the "Slot" cell, rendering each slot as a linked slot number.',
                    '- [TruncatedValue](?path=/docs/components-shared-truncatedvalue--docs) (`truncation={{ enabled: false }}`, `alignItems="start"`) — fills the "Hash" cell: the copy icon in its own column with the full hash wrapping beside it, as the transaction Summary signature.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/SlotHashesCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

const hash = (i: number) => `4xY${'k'.repeat(40)}${i}`;

export const WithEntries: Story = {
    args: {
        sysvarAccount: {
            info: [
                { hash: hash(0), slot: 312_456_789 },
                { hash: hash(1), slot: 312_456_788 },
                { hash: hash(2), slot: 312_456_787 },
                { hash: hash(3), slot: 312_456_786 },
            ],
            type: 'slotHashes',
        } satisfies SysvarSlotHashesAccount,
    },
};

export const Empty: Story = {
    args: {
        sysvarAccount: { info: [], type: 'slotHashes' } satisfies SysvarSlotHashesAccount,
    },
};
