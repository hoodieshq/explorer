import { nextjsParameters, withClipboardMock, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, screen } from 'storybook/test';

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
                    '"Spend real funds?" before a mainnet execution from the Interact tab. With intent metadata, the summary of what will be signed goes on top with the SDK\'s formatted fields, followed by a prompt to compare it with the wallet. Confirm stays locked until the details load. Without metadata it falls back to the plain warning — the mainnet warning never disappears.',
                    '',
                    '## References',
                    '',
                    '- [Dialog](?path=/docs/components-shared-dialog--docs) — the modal shell.',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) — the summary sentence.',
                    '- [BaseInstructionDisplay](?path=/docs/entities-idl-baseinstructiondisplay--docs) — its field rows (`BaseDisplayFields`), plus a Program row.',
                    '- [Skeleton](?path=/docs/components-shared-skeleton--docs) — details still loading.',
                    '- [Button](?path=/docs/components-shared-button--docs) (`outline` / `danger`, `size="sm"`) — Cancel and confirm.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/IDL/Interactive IDL/MainnetWarningDialog',
};

export default meta;
type Story = StoryObj<typeof meta>;

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

/** No intent metadata for this instruction: today's warning, unchanged. */
export const WithoutMetadata: Story = {
    args: { summary: { status: 'unavailable' } },
};
