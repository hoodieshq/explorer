import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { VoteAccountSection } from '../VoteAccountSection';
import { accountFixture, BASE_SLOT, voteAccountFixture, voteAccountV4Fixture } from './fixtures';

const meta = {
    component: VoteAccountSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'The vote account\'s overview card, matched to the block Overview card: the "Vote Account"',
                    'heading is lifted out above the surface with the account actions beside it, and the fields',
                    'render as a key/value grid. This component supplies the copy and per-field data; everything',
                    'else is composed from the shared primitives below.',
                    '',
                    '## References',
                    '',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) (`ui="dashkit"`) — the surface holding the rows.',
                    '- Key/value grid — local `Row`/`Label`/`Value` helpers: a CSS grid (`clamp(100px,25%,200px) 1fr`) with muted `outer-space-300` labels and `break-all` values, mirroring the block Overview card. Long pubkeys wrap instead of forcing horizontal scroll; a bottom `white/10` divider separates rows.',
                    '- [RefreshButton](?path=/docs/components-shared-refreshbutton--docs) — reloads the parsed account (`analyticsSection="vote_account_section"`).',
                    '- [Button](?path=/docs/components-shared-button--docs) (`variant="outline" size="sm"`) — the Raw toggle (a `Code` icon plus a `Raw` label on `md+`) that swaps the grid for the raw-bytes view.',
                    '- [AccountDownloadDropdown](?path=/docs/shared-downloaddropdown--docs) — downloads the raw account data; wraps the shared `DownloadDropdown`.',
                    '- [Address](?path=/docs/components-common-address--docs) — renders the account address (`raw`) and the linked voter / withdrawer / collector pubkeys; each carries its own copy button (`Copyable`) and tooltip, so rows must not wrap it in another `Copyable`.',
                    '- Authorized Voter(s) — `collapseAuthorizedVoters` drops the per-epoch copies the vote program caches for an unchanged authority, so each distinct key renders once with a `(since epoch N)` suffix taken from the earliest epoch it holds.',
                    '- `SolBalance` — renders the balance and (SIMD-0185) pending delegator rewards as a ◎ SOL amount.',
                    '- `Slot` — renders the Root Slot as a linked slot number.',
                    '- [BaseRawAccountRows](?path=/docs/features-account-baserawaccountrows--docs) inside a `TableCardBody` — the raw-bytes view shown while the Raw toggle is on; mounted lazily so its SWR fetch only runs when opened.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/Vote/VoteAccountSection',
} satisfies Meta<typeof VoteAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const votes = [{ confirmationCount: 31, slot: BASE_SLOT }];

export const PreV4: Story = {
    args: {
        account: accountFixture(),
        voteAccount: voteAccountFixture(votes),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Vote Account')).toBeInTheDocument();
        expect(canvas.getByText('Authorized Withdrawer')).toBeInTheDocument();
        expect(canvas.getByText('5%')).toBeInTheDocument();
        // SIMD-0185 rows only render when the node emits vote state v4
        expect(canvas.queryByText('Inflation Rewards Commission')).not.toBeInTheDocument();
        expect(canvas.queryByText('Pending Delegator Rewards (SOL)')).not.toBeInTheDocument();
    },
};

export const V4: Story = {
    args: {
        account: accountFixture(),
        voteAccount: voteAccountV4Fixture(votes),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Inflation Rewards Commission')).toBeInTheDocument();
        expect(canvas.getByText('Block Revenue Commission')).toBeInTheDocument();
        expect(canvas.getByText('100%')).toBeInTheDocument();
        expect(canvas.getByText('Pending Delegator Rewards (SOL)')).toBeInTheDocument();
    },
};

export const RepeatedAuthorizedVoter: Story = {
    // The vote program re-caches the active key every epoch, so an unchanged authority piles up
    // identical entries. They collapse to one row, dated by the earliest epoch retained.
    args: {
        account: accountFixture(),
        voteAccount: (() => {
            const voteAccount = voteAccountFixture(votes);
            const voter = voteAccount.info.authorizedVoters[0].authorizedVoter;
            voteAccount.info.authorizedVoters = [700, 701, 702].map(epoch => ({ authorizedVoter: voter, epoch }));
            return voteAccount;
        })(),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Authorized Voter')).toBeInTheDocument();
        expect(canvas.getByText('(since epoch 700)')).toBeInTheDocument();
        expect(canvas.queryByText('(since epoch 701)')).not.toBeInTheDocument();
    },
};

export const RotatedAuthorizedVoter: Story = {
    // A rotation in flight: the outgoing key holds 700-701, the incoming one takes over at 702.
    args: {
        account: accountFixture(),
        voteAccount: (() => {
            const voteAccount = voteAccountFixture(votes);
            const outgoing = voteAccount.info.authorizedVoters[0].authorizedVoter;
            voteAccount.info.authorizedVoters = [
                { authorizedVoter: outgoing, epoch: 700 },
                { authorizedVoter: outgoing, epoch: 701 },
                { authorizedVoter: voteAccount.info.nodePubkey, epoch: 702 },
            ];
            return voteAccount;
        })(),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Authorized Voters')).toBeInTheDocument();
        expect(canvas.getByText('(since epoch 700)')).toBeInTheDocument();
        expect(canvas.getByText('(since epoch 702)')).toBeInTheDocument();
        expect(canvas.queryByText('(since epoch 701)')).not.toBeInTheDocument();
    },
};
