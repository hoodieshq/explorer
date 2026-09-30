import { nextjsParameters, withClipboardMock, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseInstructionDisplay } from '../BaseInstructionDisplay';
import { NO_SENTENCE_DISPLAY, TRANSFER_SOL_DISPLAY, TRANSFER_TOKENS_DISPLAY } from './fixtures';

const meta: Meta<typeof BaseInstructionDisplay> = {
    component: BaseInstructionDisplay,
    decorators: [withCluster, withTokenInfoBatch, withClipboardMock],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    'The body of an sRFC 39 display: the intent sentence, then the labelled fields behind it. The sentence shortens its addresses; the fields keep them whole, with copy. Rows stack below `sm` so a full address keeps its width.',
                    '',
                    '## References',
                    '',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) — the sentence, or the short `intent` label when the SDK withholds it.',
                    '- [AddressLink](?path=/docs/components-shared-address-addresslink--docs) — field values that are addresses: full, with copy.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Entities/Idl/BaseInstructionDisplay',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TransferSol: Story = { args: { display: TRANSFER_SOL_DISPLAY } };

export const TransferTokens: Story = { args: { display: TRANSFER_TOKENS_DISPLAY } };

export const NoSentence: Story = { args: { display: NO_SENTENCE_DISPLAY } };
