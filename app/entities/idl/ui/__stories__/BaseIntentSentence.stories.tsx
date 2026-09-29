import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { BaseIntentSentence } from '../BaseIntentSentence';
import { DESTINATION, SOURCE, TRANSFER_SOL_DISPLAY } from './fixtures';

const meta: Meta<typeof BaseIntentSentence> = {
    component: BaseIntentSentence,
    decorators: [withCluster],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "An SDK-resolved sRFC 39 sentence. The display layer returns addresses as raw base58 inside the text; this component finds them, shortens them to five characters on each side and links them to their account pages. The full address stays in the link's title.",
                    '',
                    '## References',
                    '',
                    '- [AddressLink](?path=/docs/components-shared-address-addresslink--docs) (`truncate`, `copyable={false}`) — each address in the sentence: a mono link without the copy button, which belongs to the field rows instead.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
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
        await expect(links[0]).toHaveAttribute('title', SOURCE);
        await expect(links[1]).toHaveAttribute('title', DESTINATION);
    },
};

export const ProseOnly: Story = {
    args: { sentence: 'Set the compute unit limit to 450000' },
};
