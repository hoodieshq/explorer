import type { Meta, StoryObj } from '@storybook-config/types';

import { InstructionsSection } from '../../vendor/components/inspector/InstructionsSection';
import { DEFAULT_HANDLERS, MOCK_MESSAGE, nextjsParameters, withInspectorProviders } from './mocks';

const meta = {
    component: InstructionsSection,
    decorators: [withInspectorProviders],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/InstructionsSection',
} satisfies Meta<typeof InstructionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Renders a ComputeBudget card + a System transfer card from the mock message instructions.
export const Default: Story = {
    args: { compiledInnerInstructions: [], message: MOCK_MESSAGE },
};
