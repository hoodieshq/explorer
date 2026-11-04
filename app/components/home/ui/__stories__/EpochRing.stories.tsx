import type { Meta, StoryObj } from '@storybook-config/types';

import { EpochRing } from '../EpochRing';

const meta: Meta<typeof EpochRing> = {
    component: EpochRing,
    parameters: { layout: 'centered' },
    tags: ['autodocs', 'test'],
    title: 'Components/Home/EpochRing',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { label: '63.4%', progress: 0.634, sublabel: 'epoch 812' },
};

export const Early: Story = {
    args: { label: '4.0%', progress: 0.04, sublabel: 'epoch 813' },
};

export const Almost: Story = {
    args: { label: '98.7%', progress: 0.987, sublabel: 'epoch 814' },
};
