import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseDomainsCard } from '@/app/entities/domain/ui/BaseDomainsCard';

import { MOCK_DOMAINS, withMockProviders } from './mocks';

const meta = {
    component: BaseDomainsCard,
    decorators: [withMockProviders, withViewportFromGlobal],
    title: 'Design Slices/program-account/DomainsCard@Media',
} satisfies Meta<typeof BaseDomainsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    domains: MOCK_DOMAINS,
};

export const Mobile: Story = {
    args,
    globals: { viewport: { value: 'iphonex' } },
};

export const TabletPortrait: Story = {
    args,
    globals: { viewport: { value: 'ipad' } },
};

export const TabletLandscape: Story = {
    args,
    globals: { viewport: { isRotated: true, value: 'ipad' } },
};
