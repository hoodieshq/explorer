import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { InstructionsSection } from '../../vendor/components/inspector/InstructionsSection';
import { DEFAULT_HANDLERS, MOCK_MESSAGE, nextjsParameters, withInspectorProviders } from './mocks';

const meta = {
    component: InstructionsSection,
    decorators: [withInspectorProviders, withViewportFromGlobal],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/InstructionsSection@Media',
} satisfies Meta<typeof InstructionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { compiledInnerInstructions: [], message: MOCK_MESSAGE };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
