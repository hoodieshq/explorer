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
    decorators: [withInspectorProviders],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/TransactionSignatures',
} satisfies Meta<typeof TransactionSignatures>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { message: MOCK_MESSAGE, rawMessage: MOCK_RAW_MESSAGE, signatures: MOCK_SIGNATURES },
};

export const MissingSignatures: Story = {
    args: { message: MOCK_MESSAGE, rawMessage: MOCK_RAW_MESSAGE, signatures: [undefined] },
};
