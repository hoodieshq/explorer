import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { VotesCard } from '../VotesCard';
import { BASE_SLOT, voteAccountFixture } from './fixtures';

const meta: Meta<typeof VotesCard> = {
    argTypes: {
        layout: {
            control: 'inline-radio',
            description:
                'Inner list rendering. `table` uses the shared `<BaseTable>`; `grid` uses a CSS-grid built from `div`s (desktop-identical, diverges on mobile later).',
            options: ['table', 'grid'],
        },
    },
    component: VotesCard,
    decorators: [withCluster],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Features/Vote/VotesCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

const votes = Array.from({ length: 6 }, (_, i) => ({
    confirmationCount: 31 - i,
    slot: BASE_SLOT + i,
}));

export const WithVotes: Story = {
    args: {
        voteAccount: voteAccountFixture(votes),
    },
};

export const Empty: Story = {
    args: {
        voteAccount: voteAccountFixture([]),
    },
};

// `layout="grid"` renders the same list as a CSS grid instead of a `<table>`. Desktop visuals match the
// table stories above; the internals differ so mobile can diverge later. Flip the `layout` control.
export const GridLayout: Story = {
    args: {
        layout: 'grid',
        voteAccount: voteAccountFixture(votes),
    },
};
