import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { AddressTableLookupsCard } from '../../vendor/components/inspector/AddressTableLookupsCard';
import { DEFAULT_HANDLERS, MOCK_MESSAGE, nextjsParameters, withInspectorProviders } from './mocks';

const meta = {
    component: AddressTableLookupsCard,
    decorators: [withInspectorProviders, withViewportFromGlobal],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/AddressTableLookupsCard@Media',
} satisfies Meta<typeof AddressTableLookupsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { message: MOCK_MESSAGE };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
