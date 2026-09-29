import { nextjsParameters, withClipboardMock, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseInstructionIntentPanel } from '../BaseInstructionIntentPanel';
import { NO_SENTENCE_DISPLAY, TRANSFER_TOKENS_DISPLAY } from './intent-fixtures';

const meta: Meta<typeof BaseInstructionIntentPanel> = {
    component: BaseInstructionIntentPanel,
    decorators: [withCluster, withClipboardMock],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "The row an instruction card's **Intent** button opens at the top of the card body. Inline rather than floating, so it pushes the card rows down instead of covering them. Every state of the on-demand computation has its own body: skeleton while resolving, the sentence plus labelled fields once resolved, the fields alone when the metadata has no sentence, an error with Retry, and a plain note when the instruction is not identified.",
                    '',
                    '## References',
                    '',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) — the sentence, addresses shortened and linked.',
                    '- [BaseInstructionDisplay](?path=/docs/entities-idl-baseinstructiondisplay--docs) — its field rows (`BaseDisplayFields`), full addresses with copy.',
                    '- [Skeleton](?path=/docs/components-shared-skeleton--docs) — the loading lines.',
                    '- [Button](?path=/docs/components-shared-button--docs) (`variant="outline" size="sm"`) — Retry.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/DecodeInstructionWithIdl/BaseInstructionIntentPanel',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { state: { status: 'loading' } } };

export const Resolved: Story = {
    args: { state: { display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('intent-sentence')).toHaveTextContent('Transfer 100000000 base units from');
        await expect(canvas.getByTestId('intent-fields')).toHaveTextContent('Authority');
    },
};

/** The SDK read live account state, which may differ from the state at the transaction's slot. */
export const ResolvedWithAccountData: Story = {
    args: { state: { display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: true } },
};

export const NoSentence: Story = {
    args: { state: { display: NO_SENTENCE_DISPLAY, status: 'resolved', usedAccountData: false } },
};

export const NoSummary: Story = {
    args: { state: { display: undefined, status: 'resolved', usedAccountData: false } },
};

export const LoadFailed: Story = {
    args: { state: { retry: fn(), status: 'error' } },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Retry' }));
        await expect((args.state as { retry: () => void }).retry).toHaveBeenCalled();
    },
};
