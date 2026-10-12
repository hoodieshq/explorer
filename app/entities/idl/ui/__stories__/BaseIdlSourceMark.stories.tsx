import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseIdlSourceMark } from '../BaseIdlSourceMark';

const meta = {
    component: BaseIdlSourceMark,
    parameters: {
        docs: {
            description: {
                component:
                    'The radio mark that leads each source in the IDL selector menu, matching the filter menus’ single-pick mark.\n\n## References\n\n- [BaseIdlSourceSelect](?path=/docs/entities-idl-baseidlsourceselect--docs) — leads every source item in its menu',
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Entities/IDL/BaseIdlSourceMark',
} satisfies Meta<typeof BaseIdlSourceMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = { args: { active: true } };

export const NotSelected: Story = { args: { active: false } };
