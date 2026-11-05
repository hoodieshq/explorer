import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, userEvent, within } from 'storybook/test';

import { TokenExtensionsCard } from '../TokenExtensionsCard';
import { MINT_ADDRESS, TOKEN_EXTENSIONS, withTokenInfoSkipped } from './token-extensions-fixtures';

const meta = {
    component: TokenExtensionsCard,
    decorators: [withClusterAndAccounts, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'The Token Extensions tab of a Token-2022 mint or token account: the "Extensions" heading above',
                    "a table of the account's extensions in the feature-gates page's Table design. On desktop a row",
                    'expands in place; on a phone each extension is its own card and opens in a bottom drawer.',
                    'The card never scrolls sideways; long values wrap or truncate inside their own field.',
                    '',
                    '## References',
                    '',
                    '- [CollapsibleSection](?path=/docs/components-shared-collapsiblesection--docs) — the heading above the table with a `Collapse`/`Expand` toggle; its own card frame is off, as on the feature-gates page, since the table draws one. `sectionClassName` sets the gap down to the footer to the page between-blocks rhythm (`PAGE_SECTION_GAP` in [Page Layout](?path=/docs/design-system-page-layout--docs)).',
                    '- [RefreshButton](?path=/docs/components-shared-refreshbutton--docs) — passed as the section `actions`; refetches the parsed account.',
                    '- [TokenExtensionsSection](?path=/docs/components-account-tokenextensionssection--docs) — the extensions table, the inline details and the drawer.',
                    '- `LoadingCard` — shown while the token info loads.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/TokenExtensionsCard',
} satisfies Meta<typeof TokenExtensionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    address: MINT_ADDRESS,
    decimals: 6,
    extensions: TOKEN_EXTENSIONS,
};

export const Default: Story = {
    args,
    decorators: [withTokenInfoSkipped],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('heading', { name: 'Extensions' })).toBeInTheDocument();
    },
};

export const Expanded: Story = {
    args,
    decorators: [withTokenInfoSkipped],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const [expand] = await canvas.findAllByRole('button', { name: 'Expand extension details' });
        await userEvent.click(expand);
        await expect(await canvas.findByText('Transfer Fee Authority')).toBeInTheDocument();
    },
};

export const Loading: Story = { args };
