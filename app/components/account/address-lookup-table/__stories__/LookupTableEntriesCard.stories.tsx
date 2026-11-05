import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import type { AddressLookupTableAccountInfo } from '@validators/accounts/address-lookup-table';

import { LookupTableEntriesCard } from '../LookupTableEntriesCard';
import { lookupTableFixture, MAX_ENTRIES, maxEntriesAddresses } from './fixtures';

// Narrow Meta/Story to the `parsedLookupTable` arm of the component's union prop so args type-checks without an intersection collapse.
type ParsedArgs = { parsedLookupTable: AddressLookupTableAccountInfo };

const meta = {
    component: LookupTableEntriesCard,
    decorators: [withCluster, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'The addresses stored in an Address Lookup Table, each with the index a transaction uses to',
                    'reference it, in a collapsible section. Everything is composed from the shared primitives below.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — the "Lookup Table Entries" heading lifted out above the surface, a `Collapse`/`Expand` toggle, and the height animation. Passed `className=""` so the surface comes from the `<Card>` below.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the Tailwind `variant="tight"` surface holding the table.',
                    '- Entries grid — a pure-Tailwind CSS grid (`auto minmax(0, 1fr)`) built from `div`s with `role="table"`/`row`/`cell` for a11y, the same shape as the Slot Hashes grid. Index hugs its numbers; an empty table shows one full-width "No entries found" row.',
                    '- [Address](?path=/docs/components-common-address--docs) (`link`) — fills the "Address" cell: a label for known programs, otherwise the address, mid-truncated when the column is too narrow for all 44 characters, so the page never scrolls horizontally.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/AddressLookupTable/LookupTableEntriesCard',
} satisfies Meta<ParsedArgs>;

export default meta;
type Story = StoryObj<ParsedArgs>;

export const WithEntries: Story = {
    args: lookupTableFixture(),
};

export const Empty: Story = {
    args: lookupTableFixture([]),
};

export const MaxEntries: Story = {
    args: lookupTableFixture(maxEntriesAddresses()),
    name: `Max Entries (${MAX_ENTRIES})`,
};
