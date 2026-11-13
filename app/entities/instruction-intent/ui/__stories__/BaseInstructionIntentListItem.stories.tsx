import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { InstructionIntent, InstructionIntentResult } from '../../lib/intent';
import { DESTINATION, SOURCE } from '../../mocks/fixtures';
import { BaseInstructionIntentList } from '../BaseInstructionIntentList';
import { BaseInstructionIntentListItem } from '../BaseInstructionIntentListItem';

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

type ItemProps = ComponentProps<typeof BaseInstructionIntentListItem>;

const meta = {
    args: { index: 0, intent: textIntent('Transfer 1 SOL to a wallet'), programName: 'System Program' },
    component: BaseInstructionIntentListItem,
    decorators: [withCluster, withTokenInfoBatch],
    parameters: nextjsParameters,
    render: args => renderList([args]),
    tags: ['autodocs', 'test'],
    title: 'Entities/InstructionIntent/BaseInstructionIntentListItem',
} satisfies Meta<typeof BaseInstructionIntentListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneRow: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('#1')).toBeInTheDocument();
    },
};

export const TwoDigitNumbers: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('#9')).toBeInTheDocument();
        await expect(canvas.getByText('#10')).toBeInTheDocument();

        const lefts = canvas
            .getAllByTestId('instruction-intent-list-item')
            .map(item => item.lastElementChild?.getBoundingClientRect().left);
        await expect(lefts).toHaveLength(2);
        await expect(lefts[0]).toBe(lefts[1]);
    },
    render: args =>
        renderList([
            { ...args, index: 8 },
            { ...args, index: 9, intent: textIntent('Transfer 2 SOL to another wallet') },
        ]),
};

export const LinkedRow: Story = {
    args: { index: 2 },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('link', { name: '#3' })).toHaveAttribute('href', '#ix-3');
    },
};

export const WrappedSentence: Story = {
    args: {
        intent: textIntent(
            'Transfer 1000 tokens from a very long source account name to an equally long destination account name so that the sentence wraps onto the next line',
        ),
    },
};

export const Idle: Story = {
    args: { intent: { status: 'idle' } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-list-item-loading')).toBeInTheDocument();
    },
};

export const Loading: Story = {
    args: { intent: { status: 'loading' } },
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

function textIntent(text: string): InstructionIntentResult {
    return { result: { ...TRANSFER, sentenceParts: [{ kind: 'text', text }] }, status: 'ready' };
}

function renderList(rows: ItemProps[]) {
    return (
        <BaseInstructionIntentList ixsCount={rows.length} listId="intent-list" onToggle={fn()} open>
            {rows.map(row => (
                <BaseInstructionIntentListItem key={row.index} {...row} />
            ))}
        </BaseInstructionIntentList>
    );
}
