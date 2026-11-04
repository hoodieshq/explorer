import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { ToolsSection } from '../ToolsSection';

const meta: Meta<typeof ToolsSection> = {
    component: ToolsSection,
    decorators: [withCluster],
    parameters: { ...nextjsParameters, layout: 'padded' },
    tags: ['autodocs', 'test'],
    title: 'Components/Home/ToolsSection',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
