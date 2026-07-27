import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { TransactionSignatures } from '../../vendor/components/inspector/SignaturesCard';
import {
    DEFAULT_HANDLERS,
    MOCK_MESSAGE,
    MOCK_RAW_MESSAGE,
    MOCK_SIGNATURES,
    nextjsParameters,
    withInspectorProviders,
} from './mocks';

const meta = {
    component: TransactionSignatures,
    decorators: [withInspectorProviders, withViewportFromGlobal],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/TransactionSignatures@Media',
} satisfies Meta<typeof TransactionSignatures>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { message: MOCK_MESSAGE, rawMessage: MOCK_RAW_MESSAGE, signatures: MOCK_SIGNATURES };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
