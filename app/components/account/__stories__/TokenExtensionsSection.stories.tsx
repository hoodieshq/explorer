import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { createStore, Provider } from 'jotai';
import { expect, userEvent, within } from 'storybook/test';

import {
    EXTENSION_FIELDS_PRESETS,
    extensionFieldsBorderAtom,
    extensionFieldsDividersAtom,
    extensionFieldsGapAtom,
    extensionFieldsIndentAtom,
    extensionFieldsInnerAtom,
    extensionFieldsSpaceAtom,
} from '../token-extensions/design-variant';
import { TokenExtensionBadge } from '../token-extensions/TokenExtensionBadge';
import { TokenExtensionContent, TokenExtensionsSection } from '../TokenExtensionsSection';
import {
    ALL_TOKEN_EXTENSIONS,
    MINT_ADDRESS,
    PARSED_TOKEN_EXTENSIONS,
    parseTokenExtensions,
    TOKEN_EXTENSIONS,
} from './token-extensions-fixtures';

const meta = {
    component: TokenExtensionsSection,
    decorators: [withClusterAndAccounts, withTokenInfoBatch],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "The Token-2022 extensions of an account as a table in the feature-gates page's Table design: the",
                    'same frame, header row, text sizes and cell paddings, with columns of its own (Extension, with',
                    'the status badge right after the name, and the toggle). On desktop the chevron (or a click on the row) expands the row in place to the',
                    "extension's fields, with Raw and Docs below them. On a phone every extension is a card, the status",
                    'badge on top, and a tap opens the fields in a bottom drawer, with Raw, Docs and Close as footer',
                    'tiles. Raw swaps the fields for the parsed JSON. On desktop several rows can be open at once; the',
                    'URL hash names the one opened last. A phone shows one drawer at a time.',
                    '',
                    'How the fields look is set in the review-only design menu (REVIEW(HOO-935)): the gap between',
                    'pairs, a left indent, a border (none, a square left line, or a rounded frame with its own padding),',
                    'row dividers, the space around the fields, where Raw and Docs sit and the space under them. Any mix',
                    'can be saved as a preset, renamed with a double click and brought back in one click. The base',
                    'preset, first in the menu and never deleted, is what the settings start from (**All extensions**);',
                    'the Table look compared early on is **All extensions as tables**.',
                    '',
                    '## References',
                    '',
                    '- `FeatureGateTable` (HOO-926, Table design) — the frame, the header row, the 16px name over the 14px `outer-space-300` description, and the cell paddings.',
                    '- [TokenExtensionBadge](?path=/docs/components-account-token-extensions-tokenextensionbadge--docs) — the status badge right after the name, with the extension tooltip.',
                    '- [Button](?path=/docs/components-shared-button--docs) — the `ghost` chevron toggle; `outline` Raw and Docs under the fields; `outline` `tile` Raw, Docs and Close in the drawer footer.',
                    '- [Drawer](?path=/docs/shared-drawer-media--docs) — the phone view of an open extension: name, badge and description in the header, the fields in the body.',
                    '- [KeyValue](?path=/docs/shared-keyvalue--docs) — every field (`ExtensionField`): `density="flat"`, the default label column, spaced and divided by the design-menu settings. `ExtensionFieldGroup` heads the free-form Additional Metadata pairs.',
                    '- [Address](?path=/docs/components-common-address--docs) — every account value; truncates in the middle to the value width.',
                    '- [Timestamp](?path=/docs/components-shared-timestamp--docs) — the date fields (Interest Bearing, Scaled UI Amount), with the format dropdown.',
                    '- [ExternalLink](?path=/docs/components-shared-externallink--docs) — the Docs link and the Token Metadata URI.',
                    '- [JsonViewer](?path=/docs/components-common-jsonviewer--docs) — the Raw view: `JsonViewer version="v2"`, the always-expanded tree of the Metadata tab, with long values wrapped and a copy button for the block and for every row.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/TokenExtensionsSection',
} satisfies Meta<typeof TokenExtensionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    address: MINT_ADDRESS,
    decimals: 6,
    extensions: TOKEN_EXTENSIONS,
    parsedExtensions: PARSED_TOKEN_EXTENSIONS,
    symbol: 'SAMP',
};

export const Default: Story = { args };

// Desktop: the first row expanded in place.
export const Expanded: Story = {
    args,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const [expand] = canvas.getAllByRole('button', { name: 'Expand extension details' });
        await userEvent.click(expand);
        await expect(await canvas.findByText('Transfer Fee Authority')).toBeInTheDocument();
    },
};

export const Raw: Story = {
    args,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const [expand] = canvas.getAllByRole('button', { name: 'Expand extension details' });
        await userEvent.click(expand);
        await userEvent.click(await canvas.findByRole('button', { name: 'Show raw data' }));
        await expect(canvas.getByRole('button', { name: 'Hide raw data' })).toHaveAttribute('aria-pressed', 'true');
    },
};

const ALL_PARSED = parseTokenExtensions(ALL_TOKEN_EXTENSIONS.map(({ value }) => value));

// What an open row can hold, for every extension type at once. The rows themselves open one at a
// time, so this lays out the same content they render, one block per extension.
export const AllExtensions: Story = {
    args,
    render: () => <AllExtensionsGallery />,
};

// REVIEW(HOO-935): the same gallery with the configurator's Table preset. A store of its own keeps the settings out of
// the other stories.
const TABLE_DESIGN_STORE = createStore();
const TABLE_LOOK = EXTENSION_FIELDS_PRESETS.table;
TABLE_DESIGN_STORE.set(extensionFieldsGapAtom, TABLE_LOOK.gap);
TABLE_DESIGN_STORE.set(extensionFieldsIndentAtom, TABLE_LOOK.indent);
TABLE_DESIGN_STORE.set(extensionFieldsBorderAtom, TABLE_LOOK.border);
TABLE_DESIGN_STORE.set(extensionFieldsDividersAtom, TABLE_LOOK.dividers);
TABLE_DESIGN_STORE.set(extensionFieldsSpaceAtom, TABLE_LOOK.space);
TABLE_DESIGN_STORE.set(extensionFieldsInnerAtom, TABLE_LOOK.inner);

export const AllExtensionsAsTables: Story = {
    args,
    render: () => (
        <Provider store={TABLE_DESIGN_STORE}>
            <AllExtensionsGallery />
        </Provider>
    ),
};

function AllExtensionsGallery() {
    return (
        <div className="grid gap-3 lg:grid-cols-2">
            {ALL_TOKEN_EXTENSIONS.map(({ note, value }, index) => (
                <section key={index} className="rounded-lg border border-solid border-outer-space-800 p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-white">
                        {ALL_PARSED[index].name}
                        <TokenExtensionBadge extension={ALL_PARSED[index]} />
                        <code className="text-xs text-outer-space-300">
                            {value.extension}
                            {note && ` · ${note}`}
                        </code>
                    </div>
                    <TokenExtensionContent
                        decimals={6}
                        extension={value}
                        parsedExtension={ALL_PARSED[index]}
                        showRaw={false}
                        symbol="SAMP"
                    />
                </section>
            ))}
        </div>
    );
}
