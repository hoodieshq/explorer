import type { Meta, StoryObj } from '@storybook-config/types';

import { AccountsCard } from '../../vendor/components/inspector/AccountsCard';
import { DEFAULT_HANDLERS, MOCK_MESSAGE, nextjsParameters, withInspectorProviders } from './mocks';

const meta = {
    component: AccountsCard,
    decorators: [withInspectorProviders],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/AccountsCard',
} satisfies Meta<typeof AccountsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { message: MOCK_MESSAGE },
};
