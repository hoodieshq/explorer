import { gen } from '@__fixtures__/gen';
import { truncateAddress } from '@entities/address';
import { IMAGE_SIZE, type OgGlows } from '@entities/open-graph';
import { type InstructionSummary, UNKNOWN_PROGRAM_NAME } from '@entities/transaction-data';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { MAX_INSTRUCTION_ROWS } from '../../lib/constants';
import type { TxShareData } from '../../model/get-tx-share-data';
import { BaseTxImage } from '../BaseTxImage';

const SIGNATURE = gen.signature(1);
const UNKNOWN_PROGRAM_ID = gen.address(2);

// A browser resolves these paths on its own. The route hands the same two images in as data URIs, because
// satori resolves no relative URL - see `loadOgGlows`.
const GLOWS: OgGlows = { failed: '/img/og/pink_gradient.png', success: '/img/og/green_gradient.png' };

/**
 * `value`, or a thrown error naming what was missing. Measuring against an absent element reads as a
 * layout assertion while testing nothing, so the story fails loudly instead.
 */
function required<T>(value: T | null | undefined, what: string): T {
    if (value === null || value === undefined) throw new Error(`Expected ${what} to be in the row.`);

    return value;
}

function makeInstructions(count: number): InstructionSummary[] {
    return Array.from({ length: count }, (_, index) => ({
        accountCount: index + 1,
        name: `Instruction ${index + 1}`,
        programName: 'System Program',
    }));
}

const txShareData: TxShareData = {
    dateUtc: 'Aug 31, 2026 at 11:00:00 UTC',
    fee: '0.000005 SOL',
    instructions: [
        { accountCount: 0, name: 'Transfer', programName: 'System Program' },
        { accountCount: 14, name: 'Create Idempotent', programName: 'Associated Token Program' },
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
    args: { glows: GLOWS },
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
    args: { data: txShareData },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        expect(canvas.getByText('Explorer')).toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-date')).toHaveTextContent('Aug 31, 2026 at 11:00:00 UTC');
        expect(canvas.getByTestId('tx-image-status')).toHaveTextContent('Success');

        // The headline is the word and the signature side by side, not one string.
        expect(canvas.getByText('Transaction')).toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-signature')).toHaveTextContent(truncateAddress(SIGNATURE, 8));

        const rows = canvas.getAllByTestId('tx-image-instruction');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('System Program');
        expect(rows[0]).toHaveTextContent('Transfer');
        expect(rows[0]).toHaveTextContent('0 accounts');
        expect(rows[1]).toHaveTextContent('14 accounts');
        expect(canvas.queryByTestId('tx-image-instruction-overflow')).not.toBeInTheDocument();

        // The footer the design specifies, in its order.
        expect(canvas.getByTestId('tx-image-footer')).toBeInTheDocument();
        expect(canvas.getByText('Fee')).toBeInTheDocument();
        expect(canvas.getByText('0.000005 SOL')).toBeInTheDocument();
        expect(canvas.getByText('Slot')).toBeInTheDocument();
        // `gen.slot(1)` is 208871522, formatted with en-US separators by the footer.
        expect(canvas.getByText('208,871,522')).toBeInTheDocument();
        expect(canvas.getByText('Version')).toBeInTheDocument();
        expect(canvas.getByText('v0')).toBeInTheDocument();
        expect(canvas.getByText('Fee payer')).toBeInTheDocument();
        expect(canvas.queryByText('CU')).not.toBeInTheDocument();
    },
};

export const Failed: Story = {
    args: { data: { ...txShareData, status: 'failed' } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        expect(canvas.getByTestId('tx-image-status')).toHaveTextContent('Failed');
        // The two states differ by more than the pill: the glow behind the card changes with them.
        // Read off the inline style rather than through `toHaveStyle`, which normalises a `url()` value
        // into quoted form and would compare against the wrong string.
        expect(canvas.getByTestId('tx-image-glow').style.backgroundImage).toContain('pink_gradient');
    },
};

export const SuccessGlow: Story = {
    args: { data: txShareData },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        expect(canvas.getByTestId('tx-image-glow').style.backgroundImage).toContain('green_gradient');
    },
};

export const ExactlyAtCap: Story = {
    args: { data: { ...txShareData, instructions: makeInstructions(MAX_INSTRUCTION_ROWS) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const rows = canvas.getAllByTestId('tx-image-instruction');

        expect(rows).toHaveLength(MAX_INSTRUCTION_ROWS);
        expect(canvas.queryByTestId('tx-image-instruction-overflow')).not.toBeInTheDocument();
        // `makeInstructions` counts from one, so the first row is the singular case. Asserted as a negative
        // because `toHaveTextContent` matches a substring, and "1 account" sits inside "1 accounts".
        expect(rows[0]).not.toHaveTextContent('1 accounts');
        expect(rows[1]).toHaveTextContent('2 accounts');
    },
};

export const OverCap: Story = {
    args: { data: { ...txShareData, instructions: makeInstructions(MAX_INSTRUCTION_ROWS + 4) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        expect(canvas.getAllByTestId('tx-image-instruction')).toHaveLength(MAX_INSTRUCTION_ROWS);
        expect(canvas.getByTestId('tx-image-instruction-overflow')).toHaveTextContent('and 4 more instructions');
    },
};

// The RPC parses System, Token, Stake, Vote and Memo instructions, and a parsed instruction carries no
// account list. Those rows print their names and nothing on the right.
export const WithoutAccountCounts: Story = {
    args: {
        data: {
            ...txShareData,
            instructions: [
                { name: 'Transfer', programName: 'System Program' },
                { accountCount: 14, name: 'Increase Liquidity', programName: 'Orca Whirlpools' },
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const rows = canvas.getAllByTestId('tx-image-instruction');

        expect(rows[0]).not.toHaveTextContent('accounts');
        expect(rows[1]).toHaveTextContent('14 accounts');
    },
};

export const NoInstructions: Story = {
    args: { data: { ...txShareData, instructions: [] } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        expect(canvas.queryAllByTestId('tx-image-instruction')).toHaveLength(0);
        expect(canvas.queryByTestId('tx-image-instruction-overflow')).not.toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-signature')).toBeInTheDocument();
    },
};

// Every optional footer field absent at once, which is also the only story that exercises a missing signer.
export const MissingFooterValues: Story = {
    args: { data: { ...txShareData, signer: undefined, version: undefined } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // All four labels keep their place, so the row does not respace around a missing value.
        expect(canvas.getByText('Fee')).toBeInTheDocument();
        expect(canvas.getByText('Slot')).toBeInTheDocument();
        expect(canvas.getByText('Version')).toBeInTheDocument();
        expect(canvas.getByText('Fee payer')).toBeInTheDocument();

        // Version and fee payer fall back to the placeholder. Fee and slot are always present.
        expect(canvas.getAllByText('-')).toHaveLength(2);
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
                { accountCount: 1, name: 'Transfer', programName: 'System Program' },
                {
                    accountCount: 3,
                    name: 'Unknown Instruction',
                    nameLookup: { data: new Uint8Array([1, 2, 3]), programId: UNKNOWN_PROGRAM_ID },
                    programName: UNKNOWN_PROGRAM_NAME,
                },
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const rows = canvas.getAllByTestId('tx-image-instruction');

        expect(rows[1]).toHaveTextContent(`${UNKNOWN_PROGRAM_NAME} (${truncateAddress(UNKNOWN_PROGRAM_ID, 6)})`);
        // The named program keeps its plain label, with no address appended.
        expect(rows[0]).toHaveTextContent('System Program');
        expect(rows[0]).not.toHaveTextContent('(');
    },
};

const LONG_IDL_INSTRUCTIONS: InstructionSummary[] = [
    {
        accountCount: 22,
        name: 'Initialize Permissionless Pool With Fee Tier',
        programName: 'Meteora Dynamic Liquidity Market Maker',
    },
    {
        accountCount: 18,
        name: 'Shared Accounts Route With Token Ledger',
        programName: 'Jupiter Aggregator Limit Order V2',
    },
    {
        accountCount: 14,
        name: 'Increase Liquidity With Token Extensions',
        programName: 'Orca Whirlpools Concentrated Liquidity',
    },
];

// The canvas cannot grow, so the longest labels the card will ever draw fill every row at once and the
// footer below them proves the worst case still fits.
export const OversizedIdlNames: Story = {
    args: { data: { ...txShareData, instructions: LONG_IDL_INSTRUCTIONS } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const rows = canvas.getAllByTestId('tx-image-instruction');

        expect(rows).toHaveLength(MAX_INSTRUCTION_ROWS);

        // Every row is cut, and none is cut by rewriting its text: the label keeps its full string and the
        // layout hides the overflow, so this is measured rather than read off `textContent`. A text
        // assertion would pass on an untruncated row, which is the failure worth catching. This also fails
        // if a fixture above is edited down to something that fits and quietly stops exercising the case.
        rows.forEach(row => {
            const label = required(row.firstElementChild?.lastElementChild, 'an instruction name');
            expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);

            // The mirror of the assertion above, and the only thing holding the design's rule that a
            // program name is shown whole. Put `TEXT_ELLIPSIS` back on that span and this is what fails.
            const program = required(row.firstElementChild?.firstElementChild, 'a program name');
            expect(program.scrollWidth).toBeLessThanOrEqual(program.clientWidth);
        });

        // The account count survives the truncation of everything beside it, and stays inside the canvas.
        expect(rows[0]).toHaveTextContent('22 accounts');
        const count = required(rows[0].lastElementChild, 'an account count');
        expect(count.getBoundingClientRect().right).toBeLessThanOrEqual(rows[0].getBoundingClientRect().right + 1);

        // The row all of this exists for: the footer keeps its place instead of being pushed off the canvas.
        expect(canvas.getByTestId('tx-image-footer')).toBeInTheDocument();
    },
};

export const NoTransaction: Story = {
    args: { data: undefined },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        expect(canvas.getByText('Explorer')).toBeInTheDocument();
        expect(canvas.getByTestId('tx-image-fallback')).toBeInTheDocument();
        expect(canvas.queryByTestId('tx-image-date')).not.toBeInTheDocument();
        expect(canvas.queryByTestId('tx-image-status')).not.toBeInTheDocument();
        // A card with no transaction has no status, so it takes the success glow.
        expect(canvas.getByTestId('tx-image-glow').style.backgroundImage).toContain('green_gradient');
    },
};
