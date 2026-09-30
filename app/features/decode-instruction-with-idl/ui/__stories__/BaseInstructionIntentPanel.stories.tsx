import { nextjsParameters, withClipboardMock, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseInstructionIntentPanel } from '../BaseInstructionIntentPanel';
import { NO_SENTENCE_DISPLAY, TRANSFER_TOKENS_DISPLAY } from './intent-fixtures';

const meta: Meta<typeof BaseInstructionIntentPanel> = {
    component: BaseInstructionIntentPanel,
    decorators: [withCluster, withTokenInfoBatch, withClipboardMock],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "The row an instruction card's **Intent** button opens at the top of the card body. Inline rather than floating, so it pushes the card rows down instead of covering them. It shows the sentence only: the SDK's labelled fields repeat the card rows below. Every state of the on-demand computation has its own body: skeleton while resolving, the sentence once resolved, the short intent label when the metadata has no sentence, an error with Retry, and, when there is none, a note naming the reason: no intent metadata, no raw bytes, or an instruction the metadata does not describe.",
                    '',
                    '## References',
                    '',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) — the sentence, addresses shortened and linked.',
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
        await expect(canvas.queryByTestId('intent-fields')).not.toBeInTheDocument();
    },
};

/** The SDK read live account state, which may differ from the state at the transaction's slot. */
export const ResolvedWithAccountData: Story = {
    args: { state: { display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: true } },
};

export const NoSentence: Story = {
    args: { state: { display: NO_SENTENCE_DISPLAY, status: 'resolved', usedAccountData: false } },
};

/** The program publishes no intent metadata; the card still offers the button and says why it is empty. */
export const NoMetadata: Story = {
    args: { state: { reason: 'no-metadata', status: 'unavailable' } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-unavailable')).toHaveTextContent(
            "Couldn't get the intent",
        );
    },
};

export const NoBytes: Story = {
    args: { state: { reason: 'no-bytes', status: 'unavailable' } },
};

export const NotIdentified: Story = {
    args: { state: { reason: 'not-identified', status: 'unavailable' } },
};

export const LoadFailed: Story = {
    args: { state: { retry: fn(), status: 'error' } },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Retry' }));
        await expect((args.state as { retry: () => void }).retry).toHaveBeenCalled();
    },
};
