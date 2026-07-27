import type { Meta, StoryObj } from '@storybook-config/types';

import { AddressTableLookupsCard } from '../../vendor/components/inspector/AddressTableLookupsCard';
import { DEFAULT_HANDLERS, MOCK_MESSAGE, nextjsParameters, withInspectorProviders } from './mocks';

const meta = {
    component: AddressTableLookupsCard,
    decorators: [withInspectorProviders],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/AddressTableLookupsCard',
} satisfies Meta<typeof AddressTableLookupsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// The mock message has no address-table lookups, so this shows the empty ("No entries found") state.
export const Default: Story = {
    args: { message: MOCK_MESSAGE },
};
