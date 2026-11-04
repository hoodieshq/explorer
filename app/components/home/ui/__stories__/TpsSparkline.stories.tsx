import type { Meta, StoryObj } from '@storybook-config/types';

import { TpsSparkline } from '../TpsSparkline';

const meta: Meta<typeof TpsSparkline> = {
    component: TpsSparkline,
    decorators: [
        Story => (
            <div style={{ width: 280 }}>
                <Story />
            </div>
        ),
    ],
    parameters: { layout: 'centered' },
    tags: ['autodocs', 'test'],
    title: 'Components/Home/TpsSparkline',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { data: [2400, 2600, 2100, 2800, 3100, 2900, 3400, 3200, 3600, 3300, 3800, 4100] },
};

export const Flat: Story = {
    args: { data: [3000, 3010, 2990, 3005, 3000, 2995, 3002, 3001] },
};

export const Sparse: Story = {
    args: { data: [1200, null, 2400, 3600] },
};
