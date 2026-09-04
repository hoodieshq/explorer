import { gen } from '@__fixtures__/gen';
import { truncateAddress } from '@entities/address';
import { IMAGE_SIZE } from '@entities/open-graph';
import { type InstructionSummary, UNKNOWN_PROGRAM_NAME } from '@entities/transaction-data';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { MAX_INSTRUCTION_ROWS } from '../../lib/constants';
import type { TxShareData } from '../../model/get-tx-share-data';
import { BaseTxImage } from '../BaseTxImage';

const SIGNATURE = gen.signature(1);
const UNKNOWN_PROGRAM_ID = gen.address(2);

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

// A program no built-in source and no IDL names still carries its `nameLookup`, which is where the address
// comes from. The named row alongside it proves a resolved program does not pick up an address it lacks.
export const UnknownProgram: Story = {
    args: {
        data: {
            ...txShareData,
            instructions: [
                { name: 'Transfer', programName: 'System Program' },
                {
                    name: 'Unknown Instruction',
                    nameLookup: { data: new Uint8Array([1, 2, 3]), programId: UNKNOWN_PROGRAM_ID },
                    programName: UNKNOWN_PROGRAM_NAME,
                },
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const truncated = truncateAddress(UNKNOWN_PROGRAM_ID, 6);

        expect(canvas.getByText(`#2 ${UNKNOWN_PROGRAM_NAME} (${truncated}): Unknown Instruction`)).toBeInTheDocument();
        // The named program keeps its plain label, with no address appended.
        expect(canvas.getByText('#1 System Program: Transfer')).toBeInTheDocument();
    },
};

const LONG_IDL_INSTRUCTIONS: InstructionSummary[] = [
    { name: 'Initialize Permissionless Pool With Fee Tier', programName: 'Meteora Dynamic Liquidity Market Maker' },
    { name: 'Shared Accounts Route With Token Ledger', programName: 'Jupiter Aggregator Limit Order V2' },
    { name: 'Increase Liquidity With Token Extensions', programName: 'Orca Whirlpools Concentrated Liquidity' },
    { name: 'Lending Account Withdraw Emissions', programName: 'Marginfi Isolated Lending Protocol V2' },
    { name: 'Close Open Orders Indexer Account', programName: 'OpenBook V2 Central Limit Order Book' },
];

// The canvas cannot grow, so the longest labels the card will ever draw fill every row at once and the
// footer below them proves the worst case still fits.
export const OversizedIdlNames: Story = {
    args: {
        data: { ...txShareData, instructions: LONG_IDL_INSTRUCTIONS },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const rows = canvas.getAllByTestId('tx-image-instruction');

        expect(rows).toHaveLength(MAX_INSTRUCTION_ROWS);

        // The first row in full: both names cut at 29 characters and marked, rather than the program name
        // spending the line and leaving the instruction nothing.
        expect(rows[0]).toHaveTextContent('#1 Meteora Dynamic Liquidity Mar...: Initialize Permissionless Poo...');

        // And no row prints either name whole, so the cap is not something only the first row gets. This
        // also fails if a fixture above is edited down under the cap and quietly stops exercising it.
        LONG_IDL_INSTRUCTIONS.forEach(({ name, programName }, index) => {
            expect(rows[index]).not.toHaveTextContent(programName);
            expect(rows[index]).not.toHaveTextContent(name);
        });

        // The row all of this exists for: the footer keeps its place instead of being pushed off the canvas.
        expect(canvas.getByTestId('tx-image-footer')).toBeInTheDocument();
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
