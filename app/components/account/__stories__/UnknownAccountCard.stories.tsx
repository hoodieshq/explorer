import { gen } from '@__fixtures__/gen';
import { PublicKey } from '@solana/web3.js';
import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { UnknownAccountCard } from '../UnknownAccountCard';

const meta = {
    component: UnknownAccountCard,
    decorators: [withClusterAndAccounts, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'Fallback "Overview" card for accounts with no dedicated section (plain system wallets, and any owner the app does not decode). Rebuilt onto the block/vote Overview layout: the heading is lifted out above a tight-card surface, and the fields render as a key/value CSS grid instead of a dashkit `<table>`.',
                    '',
                    '## References',
                    '',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) (`variant="tight"`, `!rounded-lg`) — the surface holding the rows: an 8px-radius `outer-space-800` border with no shadow, matching the block Overview / Vote Account cards. `overflow-hidden` clips the row dividers to the corners.',
                    '- Key/value grid — a pure-Tailwind grid (`clamp(100px,25%,200px) 1fr`) built from `div`s, mirroring the transaction Accounts/Token Balances tables. The `1fr` value column lets long mono values wrap (`break-all`) instead of forcing horizontal scroll on narrow screens; rows are separated by `border-white/10` dividers.',
                    '- [Button](?path=/docs/components-shared-button--docs) (`size="sm"`) — the Raw toggle in the header: `variant="outline"` when off, `variant="default"` + `shadow-active-sm` when on, showing a `Code` glyph with a `Raw` label on `md+`.',
                    '- [AccountDownloadDropdown](?path=/docs/features-account-accountdownloaddropdown--docs) — the header download action, unchanged from the previous `AccountCard` chrome.',
                    '- [Address](?path=/docs/components-common-address--docs) — fills the Address (`raw`), Assigned Program Id (`link`) values; renders its own copy button, so it is not double-wrapped in `Copyable`.',
                    '- [SolBalance](?path=/docs/components-common-solbalance--docs) — the Balance (SOL) value; replaced by an inline cluster-lookup message when `lamports === 0`.',
                    '- `BaseRawAccountRows` / [TableCardBody](?path=/docs/components-common-tablecardbody--docs) — the raw-bytes view shown while the Raw toggle is on; mounted lazily so its fetch does not run for the common case.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/UnknownAccountCard',
} satisfies Meta<typeof UnknownAccountCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseAccount = {
    data: {},
    executable: false,
    lamports: 1_000_000_000,
    owner: PublicKey.default,
    pubkey: gen.publicKey(1),
    space: 165,
};

export const WithBalance: Story = {
    args: {
        account: baseAccount,
    },
};

export const ExecutableProgram: Story = {
    args: {
        account: { ...baseAccount, executable: true, pubkey: gen.publicKey(2), space: undefined },
    },
};

export const ZeroBalanceTriggersClusterLookup: Story = {
    args: {
        account: { ...baseAccount, lamports: 0, pubkey: gen.publicKey(3) },
    },
};
