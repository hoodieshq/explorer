import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseSelectionMark } from '../BaseSelectionMark';

const meta: Meta<typeof BaseSelectionMark> = {
    args: { active: true, multiple: false },
    component: BaseSelectionMark,
    tags: ['autodocs', 'test'],
    title: 'Shared/Filters/BaseSelectionMark',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Radio: Story = {};

export const RadioOff: Story = { args: { active: false } };

export const Checkbox: Story = { args: { multiple: true } };

export const CheckboxOff: Story = { args: { active: false, multiple: true } };
