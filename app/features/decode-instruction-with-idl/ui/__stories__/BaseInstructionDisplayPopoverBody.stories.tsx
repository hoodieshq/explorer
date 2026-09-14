import { gen } from '@__fixtures__/gen';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseInstructionDisplayPopoverBody } from '../BaseInstructionDisplayPopoverBody';

const SOURCE = gen.address(1);
const DESTINATION = gen.address(2);

const meta: Meta<typeof BaseInstructionDisplayPopoverBody> = {
    component: BaseInstructionDisplayPopoverBody,
    globals: { viewport: { value: 'responsive' } },
    tags: ['autodocs', 'test'],
    title: 'Features/DecodeInstructionWithIdl/BaseInstructionDisplayPopoverBody',
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The resolved sRFC 39 display: the interpolated sentence plus the fields behind it. */
export const Resolved: Story = {
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
        isResolving: false,
    },
};

/** Waiting on the wire bytes or on the display layer's account reads. */
export const Resolving: Story = {
    args: {
        isResolving: true,
    },
};

/** Settled without a display: the IDL publishes intents, but not for this instruction. */
export const NoSummary: Story = {
    args: {
        isResolving: false,
    },
};
