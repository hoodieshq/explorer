import { nextjsParameters, withClipboardMock, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { BaseIntentSentence } from '../BaseIntentSentence';
import { DESTINATION, SOURCE, TRANSFER_SOL_DISPLAY } from './fixtures';

const meta: Meta<typeof BaseIntentSentence> = {
    component: BaseIntentSentence,
    decorators: [withCluster, withTokenInfoBatch, withClipboardMock],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "An SDK-resolved sRFC 39 sentence. The display layer returns addresses as raw base58 inside the text; this component finds them and renders each with the app's `Address`: a link, a copy button and the cross-page hover highlight. Known addresses show their label, others are shortened to five characters on each side.",
                    '',
                    '## References',
                    '',
                    '- [Address](?path=/docs/components-common-address--docs) (`link`, `noNicknameEditing`, `overrideText` for the short form) — each address in the sentence.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test', 'clear-sign'],
    title: 'Entities/Idl/BaseIntentSentence',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAddresses: Story = {
    args: { sentence: TRANSFER_SOL_DISPLAY.interpolatedIntent ?? '' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const links = canvas.getAllByRole('link');

        await expect(links).toHaveLength(2);
        await expect(links[0]).toHaveTextContent('Gjzy5…X1GBv');
        await expect(links[0]).toHaveAttribute('href', expect.stringContaining(SOURCE));
        await expect(links[1]).toHaveAttribute('href', expect.stringContaining(DESTINATION));
    },
};

export const ProseOnly: Story = {
    args: { sentence: 'Set the compute unit limit to 450000' },
};
