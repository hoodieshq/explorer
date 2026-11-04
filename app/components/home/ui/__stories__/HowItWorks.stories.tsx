import type { Meta, StoryObj } from '@storybook-config/types';

import { HowItWorks } from '../HowItWorks';

const meta: Meta<typeof HowItWorks> = {
    component: HowItWorks,
    parameters: { layout: 'padded' },
    tags: ['autodocs', 'test'],
    title: 'Components/Home/HowItWorks',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
