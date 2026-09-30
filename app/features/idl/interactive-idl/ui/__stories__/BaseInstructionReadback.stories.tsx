import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { BaseInstructionReadback } from '../BaseInstructionReadback';

const SOURCE = 'Gjzy5nK46npKae6cKsCpnXwnePkyBTesUQfHVSqX1GBv';
const DESTINATION = 'EjYkrNiQNd6QHhKx5yYARxWXvSNsJ11CLJPhgUrhPE5M';

const meta: Meta<typeof BaseInstructionReadback> = {
    component: BaseInstructionReadback,
    decorators: [withCluster, withTokenInfoBatch],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "The one-line **Intent** above Execute on the Interact tab (the same word as the instruction cards use). Always visible, no accordion. The intent template renders first and fills in as fields are completed; dashed slots name what is still missing. Once the form is complete the SDK's own sentence takes over, with values formatted (e.g. lamports as SOL). No field list — the form above already is one. Zero RPC.",
                    '',
                    '## References',
                    '',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) — the complete sentence, addresses shortened and linked.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/IDL/Interactive IDL/BaseInstructionReadback',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        missing: ['amount', 'source', 'destination'],
        parts: [
            { kind: 'text', text: 'Transfer ' },
            { kind: 'missing', name: 'amount' },
            { kind: 'text', text: ' from ' },
            { kind: 'missing', name: 'source' },
            { kind: 'text', text: ' to ' },
            { kind: 'missing', name: 'destination' },
        ],
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Add amount, source and destination to complete it.'),
        ).toBeVisible();
    },
};

export const PartlyFilled: Story = {
    args: {
        missing: ['destination'],
        parts: [
            { kind: 'text', text: 'Transfer ' },
            { isAddress: false, kind: 'filled', name: 'amount', text: '1500000000' },
            { kind: 'text', text: ' from ' },
            { isAddress: true, kind: 'filled', name: 'source', text: 'Gjzy5…X1GBv' },
            { kind: 'text', text: ' to ' },
            { kind: 'missing', name: 'destination' },
        ],
    },
};

export const Complete: Story = {
    args: {
        missing: [],
        parts: [],
        sentence: `Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`,
    },
};
