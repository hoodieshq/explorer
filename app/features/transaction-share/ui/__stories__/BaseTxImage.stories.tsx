import { gen } from '@__fixtures__/gen';
import { IMAGE_SIZE } from '@entities/open-graph';
import type { InstructionSummary } from '@entities/transaction-data';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { MAX_INSTRUCTION_ROWS } from '../../lib/constants';
import type { TxShareData } from '../../model/get-tx-share-data';
import { BaseTxImage } from '../BaseTxImage';

const SIGNATURE = gen.signature(1);

function makeInstructions(count: number): InstructionSummary[] {
    return Array.from({ length: count }, (_, index) => ({
        name: `Instruction ${index + 1}`,
        programName: 'System Program',
    }));
}

const txShareData: TxShareData = {
    computeUnits: 4321,
    dateUtc: 'Aug 31, 2026 at 11:00:00 UTC',
    fee: '0.000005 SOL',
    instructions: [
        { name: 'Transfer', programName: 'System Program' },
        { name: 'Create Idempotent', programName: 'Associated Token Program' },
    ],
    signature: SIGNATURE,
    signer: gen.address(1),
    slot: Number(gen.slot(1)),
    status: 'success',
    version: 'v0',
};

const meta: Meta<typeof BaseTxImage> = {
    argTypes: {
        data: {
            control: 'object',
            description: 'Shaped transaction data. undefined renders the fallback.',
        },
    },
    component: BaseTxImage,
    decorators: [
        Story => (
            <div style={{ height: IMAGE_SIZE.height, width: IMAGE_SIZE.width }}>
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs', 'test'],
    title: 'Features/TransactionShare/BaseTxImage',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        data: txShareData,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Explorer')).toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-date')).toHaveTextContent('Aug 31, 2026 at 11:00:00 UTC');
        expect(canvas.getByTestId('tx-image-fee')).toHaveTextContent('Fee 0.000005 SOL');
        expect(canvas.getByTestId('tx-image-status')).toHaveTextContent('Success');
        expect(canvas.getByText('#1 System Program: Transfer')).toBeInTheDocument();
        expect(canvas.getByText('#2 Associated Token Program: Create Idempotent')).toBeInTheDocument();
        expect(canvas.queryByTestId('tx-image-instruction-overflow')).not.toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-footer')).toBeInTheDocument();
        expect(canvas.getByText('Signer')).toBeInTheDocument();
        // `gen.slot(1)` is 208871522, formatted with en-US separators by the footer.
        expect(canvas.getByText('208,871,522')).toBeInTheDocument();
        expect(canvas.getByText('4,321')).toBeInTheDocument();
        expect(canvas.getByText('v0')).toBeInTheDocument();
    },
};

export const Failed: Story = {
    args: {
        data: { ...txShareData, status: 'failed' },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByTestId('tx-image-status')).toHaveTextContent('Failed');
    },
};

export const ExactlyAtCap: Story = {
    args: {
        data: { ...txShareData, instructions: makeInstructions(MAX_INSTRUCTION_ROWS) },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getAllByTestId('tx-image-instruction')).toHaveLength(MAX_INSTRUCTION_ROWS);
        expect(canvas.queryByTestId('tx-image-instruction-overflow')).not.toBeInTheDocument();
    },
};

export const OverCap: Story = {
    args: {
        data: { ...txShareData, instructions: makeInstructions(MAX_INSTRUCTION_ROWS + 3) },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getAllByTestId('tx-image-instruction')).toHaveLength(MAX_INSTRUCTION_ROWS);
        expect(canvas.getByTestId('tx-image-instruction-overflow')).toHaveTextContent('and 3 more');
    },
};

export const NoInstructions: Story = {
    args: {
        data: { ...txShareData, instructions: [] },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.queryAllByTestId('tx-image-instruction')).toHaveLength(0);
        expect(canvas.queryByTestId('tx-image-instruction-overflow')).not.toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-signature')).toBeInTheDocument();
    },
};

// Every optional footer field absent at once, which is also the only story that exercises a missing signer.
export const MissingFooterValues: Story = {
    args: {
        data: { ...txShareData, computeUnits: undefined, signer: undefined, version: undefined },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByTestId('tx-image-footer')).toBeInTheDocument();

        // All four labels keep their place, so the row does not respace around a missing value.
        expect(canvas.getByText('Signer')).toBeInTheDocument();
        expect(canvas.getByText('Block')).toBeInTheDocument();
        expect(canvas.getByText('CU')).toBeInTheDocument();
        expect(canvas.getByText('Version')).toBeInTheDocument();

        // Signer, CU and Version fall back to the placeholder. Block is required, so it still prints.
        expect(canvas.getAllByText('-')).toHaveLength(3);
        expect(canvas.getByText('208,871,522')).toBeInTheDocument();
    },
};

export const NoTransaction: Story = {
    args: {
        data: undefined,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Explorer')).toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-fallback')).toBeInTheDocument();
        expect(canvas.queryByTestId('tx-image-date')).not.toBeInTheDocument();
        expect(canvas.queryByTestId('tx-image-fee')).not.toBeInTheDocument();
    },
};
