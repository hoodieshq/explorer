import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { PageHeader } from '../PageHeader';

// The "Details / <title>" header is identical across the Transaction, Block, and Account pages — only
// the subtitle (eyebrow, on top) and the title (below) change. So this is one universal story; edit
// the two texts via the controls instead of duplicating a story per page.
const meta = {
    argTypes: {
        eyebrow: { control: 'text' },
        title: { control: 'text' },
    },
    args: { eyebrow: 'Subtitle', title: 'Title' },
    component: PageHeader,
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/PageHeader',
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Subtitle')).toBeInTheDocument();
        expect(canvas.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    },
};
