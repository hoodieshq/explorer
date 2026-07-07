import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseDomainsCard } from '@/app/entities/domain/ui/BaseDomainsCard';

import { MOCK_DOMAINS, withMockProviders } from './mocks';

// Domains tab content. The top-level DomainsCard fetches SNS + ANS domains via SWR;
// we render the exported presentational variant with a mock domain list so the
// table is deterministic (Address column needs the token-info + cluster providers).
const meta = {
    component: BaseDomainsCard,
    decorators: [withMockProviders],
    title: 'Design Slices/program-account/DomainsCard',
} satisfies Meta<typeof BaseDomainsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Owned SNS + ANS domain names, sorted by name.
export const Default: Story = {
    args: {
        domains: MOCK_DOMAINS,
    },
};
