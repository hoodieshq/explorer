import { nextjsParameters, withStats } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SlotStrip } from '../SlotStrip';

const meta: Meta<typeof SlotStrip> = {
    component: SlotStrip,
    decorators: [withMockRpc, withStats],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Home/SlotStrip',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
