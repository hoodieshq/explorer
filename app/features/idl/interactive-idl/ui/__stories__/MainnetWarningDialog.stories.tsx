import { nextjsParameters, withClipboardMock, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { useEffect, useState } from 'react';
import { expect, fn, screen, userEvent, within } from 'storybook/test';

import { Button } from '@/app/components/shared/ui/button';

import type { MainnetSummary } from '../../model/display/use-mainnet-summary';
import { MainnetWarningDialog } from '../MainnetWarningDialog';

const SOURCE = 'Gjzy5nK46npKae6cKsCpnXwnePkyBTesUQfHVSqX1GBv';
const DESTINATION = 'EjYkrNiQNd6QHhKx5yYARxWXvSNsJ11CLJPhgUrhPE5M';

const TRANSFER = {
    fields: [
        { label: 'Amount', value: '1.5 SOL' },
        { label: 'From', value: SOURCE },
        { label: 'To', value: DESTINATION },
    ],
    intent: 'Transfer SOL',
    interpolatedIntent: `Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`,
};

const meta: Meta<typeof MainnetWarningDialog> = {
    args: { onCancel: fn(), onConfirm: fn(), onOpenChange: fn(), open: true },
    component: MainnetWarningDialog,
    decorators: [withCluster, withTokenInfoBatch, withClipboardMock],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    '"Spend real funds?" before a mainnet execution from the Interact tab. The text asks to compare what is signed with the wallet. With intent metadata the sentence follows at 20px, with the SDK\'s fields and the program behind "Show fields"; Confirm stays locked until the details load. Without metadata the text asks to check the form, then the wallet — the mainnet warning never disappears. One dialog on every screen; the whole box scrolls.',
                    '',
                    '## References',
                    '',
                    'What the dialog is built from:',
                    '',
                    '- [Dialog](?path=/docs/components-shared-dialog--docs) — the modal shell.',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) (`size="xl"`) — the summary sentence.',
                    '- `BaseDisplayFields` (from [BaseInstructionDisplay](?path=/docs/entities-idl-baseinstructiondisplay--docs)) — the SDK\'s field rows behind "Show fields".',
                    '- [KeyValue](?path=/docs/shared-keyvalue--docs) with [Address](?path=/docs/components-common-address--docs) — the Program row under the fields.',
                    '- [Skeleton](?path=/docs/components-shared-skeleton--docs) — details still loading.',
                    '- [Button](?path=/docs/components-shared-button--docs) (`size="lg"`) — confirm in the new `danger` variant ([With Icons](?path=/story/components-shared-button--with-icons)) and Cancel in `outline`; `ghost` for "Show fields".',
                    '- [Palette → Agreements](?path=/story/design-system-palette--agreements) — the danger colour (`dk-danger`) of the title and the confirm button.',
                    '- `CustomUrlConsentDialog` in the cluster switcher (no story) — the box this dialog copies: ground, edge, padding, close mark.',
                    '',
                    '## Relies on',
                    '',
                    '`InteractWithIdl` opens the dialog; the data comes from:',
                    '',
                    '1. **The cluster and a cookie** (`useMainnetConfirmation`). Execute on mainnet asks first; elsewhere it runs at once. Confirming sets the `idl_mainnet_accepted` cookie for 182 days, and the dialog does not ask again.',
                    "2. **The instruction's intent template** in the program's IDL (sRFC 39 display metadata). Without one the summary is unavailable and the dialog shows the plain warning.",
                    '3. **`@codama/dynamic-instructions` with RPC** (`useMainnetSummary`): the call params Execute is about to send, formatted with chain data (decimals, token accounts). The one place the Interact tab spends RPC on formatting, once, when the dialog opens. A failure falls back to the plain warning.',
                    '4. **The current cluster** for the RPC reads and the Terms link.',
                ].join('\n'),
            },

            groups: [
                {
                    prototype: 'Interactive',
                    states: ['WithSummary', 'LoadingSummary', 'WithoutMetadata'],
                    title: 'Execute on mainnet',
                },
            ],
            // The dialog portals to the document body, so an inline docs story would cover the whole page. Each story
            // gets its own frame instead, tall enough for the dialog with its fields open.
            story: { height: '560px', inline: false },
        },
    },
    tags: ['autodocs', 'test', 'clear-sign'],
    title: 'Features/IDL/Interactive IDL/MainnetWarningDialog',
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Execute on mainnet opens the dialog: details load first, and Confirm unlocks once they are in. */
export const Interactive: Story = {
    args: { open: false },
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Execute' }));
        await expect(await screen.findByTestId('mainnet-confirm')).toBeDisabled();
        await expect(await screen.findByText('Show fields')).toBeVisible();
        await expect(screen.getByTestId('mainnet-confirm')).toBeEnabled();
    },
    render: () => <InteractiveDialog />,
};

export const WithSummary: Story = {
    args: { summary: { display: TRANSFER, programId: '11111111111111111111111111111111', status: 'resolved' } },
    play: async () => {
        await expect(await screen.findByTestId('mainnet-summary')).toHaveTextContent('System Program');
        await expect(screen.getByTestId('mainnet-confirm')).toBeEnabled();
    },
};

export const LoadingSummary: Story = {
    args: { summary: { status: 'loading' } },
    play: async () => {
        await expect(await screen.findByTestId('mainnet-confirm')).toBeDisabled();
    },
};

/** No summary to show: the text asks to check the form, then the wallet. */
export const WithoutMetadata: Story = {
    args: { summary: { status: 'unavailable' } },
    name: 'Plain warning: no intent template for the instruction, the instruction not identified, or the summary failed to load',
};

// Long enough to see the locked Confirm and the skeleton while the details load.
const SUMMARY_DELAY_MS = 900;

// Stands in for `InteractWithIdl`: Execute opens the confirmation, and `useMainnetSummary` settles after a moment.
function InteractiveDialog() {
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState<MainnetSummary>();

    useEffect(() => {
        if (!open) return;
        setSummary({ status: 'loading' });
        const timer = setTimeout(
            () => setSummary({ display: TRANSFER, programId: '11111111111111111111111111111111', status: 'resolved' }),
            SUMMARY_DELAY_MS,
        );
        return () => clearTimeout(timer);
    }, [open]);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Execute</Button>
            <MainnetWarningDialog
                open={open}
                onOpenChange={setOpen}
                onConfirm={() => setOpen(false)}
                onCancel={() => setOpen(false)}
                summary={summary}
            />
        </>
    );
}
