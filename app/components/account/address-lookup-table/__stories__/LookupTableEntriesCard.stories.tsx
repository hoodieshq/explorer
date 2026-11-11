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
    parameters: nextjsParameters,
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
