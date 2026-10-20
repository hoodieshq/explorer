import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { InstructionIntent } from '../../lib/intent';
import { DESTINATION, SOURCE } from '../../mocks/fixtures';
import { InstructionIntentListItemBody } from '../InstructionIntentListItemBody';

const TRANSFER: InstructionIntent = {
    fields: [],
    interpolated: true,
    sentenceParts: [
        { kind: 'text', text: 'Transfer 100000000 base units from ' },
        { address: SOURCE, kind: 'address' },
        { kind: 'text', text: ' to ' },
        { address: DESTINATION, kind: 'address' },
    ],
    usedAccountData: false,
};

const retry = fn();

const meta = {
    args: { intent: { status: 'loading' }, programName: 'System Program' },
    component: InstructionIntentListItemBody,
    decorators: [withCluster, withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Entities/InstructionIntent/InstructionIntentListItemBody',
} satisfies Meta<typeof InstructionIntentListItemBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
    args: { intent: { status: 'idle' } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-list-item-loading')).toBeInTheDocument();
    },
};

export const Loading: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-list-item-loading')).toBeInTheDocument();
    },
};

export const Ready: Story = {
    args: { intent: { result: TRANSFER, status: 'ready' } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('intent-sentence')).toHaveTextContent(
            'Transfer 100000000 base units from',
        );
    },
};

export const ReadyWithoutDetails: Story = {
    args: {
        intent: {
            result: {
                ...TRANSFER,
                interpolated: false,
                sentenceParts: [{ kind: 'text', text: 'Mint tokens' }],
                usedAccountData: true,
            },
            status: 'ready',
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Mint tokens')).toBeInTheDocument();
        await expect(
            canvas.queryByText("Couldn't fill in the details for this instruction. The rows below carry them."),
        ).not.toBeInTheDocument();
        await expect(
            canvas.queryByText('Uses current account data, which may differ from the time of this transaction.'),
        ).not.toBeInTheDocument();
    },
};

export const FailedWithRetry: Story = {
    args: { intent: { retry, status: 'failed' } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText("Couldn't load the data the intent needs.")).toBeInTheDocument();
        await userEvent.click(canvas.getByTestId('instruction-intent-list-item-retry'));
        await expect(retry).toHaveBeenCalledOnce();
    },
};

export const FailedWithoutRetry: Story = {
    args: { intent: { status: 'failed' } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).queryByTestId('instruction-intent-list-item-retry')).not.toBeInTheDocument();
    },
};

export const UnavailableKnownProgram: Story = {
    args: { intent: { reason: 'idl-failed', status: 'unavailable' } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByTestId('instruction-intent-list-item-unavailable')).toHaveTextContent(
            'System Program · intent unavailable',
        );
        await expect(canvas.queryByText("Couldn't load this program's IDL.")).not.toBeInTheDocument();
    },
};

export const UnavailableUnknownProgram: Story = {
    args: {
        intent: { reason: 'idl-failed', status: 'unavailable' },
        programName: 'Unknown Program (Bz4Ao…2eV2G)',
    },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-list-item-unavailable')).toHaveTextContent(
            'Unknown Program (Bz4Ao…2eV2G)',
        );
    },
};

export const UnavailableWithInstructionName: Story = {
    args: {
        instructionName: 'Swap Base Input',
        intent: { reason: 'idl-failed', status: 'unavailable' },
        programName: 'Raydium Cp Swap',
    },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-list-item-unavailable')).toHaveTextContent(
            'Raydium Cp Swap: Swap Base Input · intent unavailable',
        );
    },
};
