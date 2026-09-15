import { gen } from '@__fixtures__/gen';
import type { Meta, StoryObj } from '@storybook-config/types';

import { InstructionDisplaySummary } from '../InstructionDisplaySummary';

const SOURCE = gen.address(1);
const DESTINATION = gen.address(2);
const MINT = gen.address(3);

const meta: Meta<typeof InstructionDisplaySummary> = {
    component: InstructionDisplaySummary,
    globals: { viewport: { value: 'responsive' } },
    tags: ['autodocs', 'test'],
    title: 'Features/IDL/Interactive IDL/InstructionDisplaySummary',
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Full sRFC 39 metadata: a scaled amount with a unit, and labelled accounts. */
export const InterpolatedSentence: Story = {
    args: {
        defaultExpanded: true,
        display: {
            fields: [
                { label: 'Amount', value: '1.5 SOL' },
                { label: 'From', value: SOURCE },
                { label: 'To', value: DESTINATION },
            ],
            intent: 'Transfer SOL',
            interpolatedIntent: `Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`,
        },
    },
};

/** No sentence in the IDL, so the headline falls back to the intent label. */
export const IntentFallback: Story = {
    args: {
        defaultExpanded: true,
        display: {
            fields: [
                { label: 'Discriminator', value: '2' },
                { label: 'Amount', value: '1500000000' },
                { label: 'Source', value: SOURCE },
                { label: 'Destination', value: DESTINATION },
            ],
            intent: 'Transfer Sol',
            interpolatedIntent: null,
        },
    },
};

/** An amount whose scale could not be resolved: marked raw, and the sentence is withheld. */
export const UnresolvedAmountScale: Story = {
    args: {
        defaultExpanded: true,
        display: {
            fields: [
                { label: 'Amount', value: '1500000 (raw)' },
                { label: 'Mint', value: MINT },
                { label: 'To', value: DESTINATION },
            ],
            intent: 'Mint tokens',
            interpolatedIntent: null,
        },
    },
};

/** The default: collapsed to its title row until the user opens it. */
export const Collapsed: Story = {
    args: {
        display: {
            fields: [
                { label: 'Amount', value: '1.5 SOL' },
                { label: 'From', value: SOURCE },
                { label: 'To', value: DESTINATION },
            ],
            intent: 'Transfer SOL',
            interpolatedIntent: `Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`,
        },
    },
};
