import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import { GroupedDocsPage } from '@storybook-config/grouped-docs-page';
import type { Meta, StoryObj } from '@storybook-config/types';
import { useEffect, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { InstructionIntentState } from '../../model/intent-state';
import { BaseInstructionsReadOut, BaseReadOutItem } from '../BaseInstructionsReadOut';
import { TRANSFER_TOKENS_DISPLAY } from './intent-fixtures';

const COMPUTE_LIMIT = {
    fields: [{ label: 'Units', value: '450000' }],
    intent: 'Set compute unit limit',
    interpolatedIntent: 'Set the compute unit limit to 450000',
};

const UNKNOWN_PROGRAM = 'Unknown Program (Bz4AoAXL8vkTSFPqR52GwNxFixAbKPJ3VShhgoS2eV2G)';

const ROWS: { programName: string; state: InstructionIntentState }[] = [
    {
        programName: 'Compute Budget Program',
        state: { display: COMPUTE_LIMIT, status: 'resolved', usedAccountData: false },
    },
    {
        programName: 'Token Program',
        state: { display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: true },
    },
    { programName: UNKNOWN_PROGRAM, state: { reason: 'no-metadata', status: 'unavailable' } },
];

// Long enough to see the skeletons the page shows while the SDK computes, short enough not to stall a click-through.
const RESOLVE_DELAY_MS = 900;

const meta: Meta<typeof BaseInstructionsReadOut> = {
    args: { count: 4, onToggle: fn() },
    component: BaseInstructionsReadOut,
    decorators: [withCluster, withTokenInfoBatch],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "**What this transaction does**: every instruction's intent sentence, in order, behind one click — the explorer's equivalent of a hardware wallet's review screen. It sits last in the Summary card on the transaction page and in the Overview card in the Inspector. Instructions without an intent keep their row, named by their program as the instruction cards name it, so the count always matches the transaction.",
                    '',
                    '## References',
                    '',
                    'What the block is built from:',
                    '',
                    '- `BaseReadOutItem` (this file) — one row per instruction, in every intent state; see **Open**.',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) (`size="sm"`) — each resolved sentence.',
                    '- [Badge](?path=/docs/components-shared-badge--docs) (`variant="success"`) — the instruction number, matching the cards below.',
                    '- [Button](?path=/docs/components-shared-button--docs) (`variant="ghost" size="icon"`) — the chevron; the whole header row toggles too.',
                    '- [Skeleton](?path=/docs/components-shared-skeleton--docs) — rows still resolving.',
                    '',
                    '## Relies on',
                    '',
                    '`InstructionsReadOut` feeds this component; the data comes from:',
                    '',
                    '1. **Wire bytes of every top-level instruction.** The transaction page takes them from the raw transaction the Summary card fetches on mount; the Inspector, from the message it decoded, once address lookup tables are resolved. Without bytes a row says the intent is unavailable.',
                    '2. **The program\'s IDL from Program Metadata**, carrying sRFC 39 display metadata. A program without it gets an "intent unavailable" row named by its program.',
                    "3. **`@codama/dynamic-instructions`** builds the sentence from the IDL and the bytes. It may read live accounts over RPC (e.g. mint decimals), which can differ from the state at the transaction's slot.",
                    "4. **Computed on the first open only** and cached for the page's lifetime, keyed by cluster and bytes. The cache is shared with the Intent button on each instruction card, so opening one after the other costs nothing.",
                    '5. **The current cluster**: the IDL, the RPC reads and the program names all come from it.',
                ].join('\n'),
            },
            page: () => (
                <GroupedDocsPage
                    groups={[{ prototype: Interactive, states: [Collapsed, Open], title: 'Expand and collapse' }]}
                />
            ),
        },
    },
    tags: ['autodocs', 'test', 'clear-sign'],
    title: 'Features/DecodeInstructionWithIdl/BaseInstructionsReadOut',
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Expand and collapse it: the first open shows skeletons while the intents compute, later opens read the cache. */
export const Interactive: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTestId('read-out-trigger'));
        await expect(await canvas.findByText('Set the compute unit limit to 450000')).toBeVisible();
    },
    render: () => <InteractiveReadOut />,
};

export const Collapsed: Story = { args: { open: false } };

/** Every row state: resolved (with and without live account data), loading, error, unavailable. */
export const Open: Story = {
    args: {
        children: [
            <BaseReadOutItem
                key={0}
                index={0}
                programName="Compute Budget Program"
                state={{ display: COMPUTE_LIMIT, status: 'resolved', usedAccountData: false }}
            />,
            <BaseReadOutItem
                key={1}
                index={1}
                programName="Token Program"
                state={{ display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: true }}
            />,
            <BaseReadOutItem key={2} index={2} programName="Token Program" state={{ status: 'loading' }} />,
            <BaseReadOutItem key={3} index={3} programName="Token Program" state={{ retry: fn(), status: 'error' }} />,
            <BaseReadOutItem
                key={4}
                index={4}
                programName={UNKNOWN_PROGRAM}
                state={{ reason: 'no-metadata', status: 'unavailable' }}
            />,
        ],
        count: 5,
        open: true,
    },
};

// Stands in for `InstructionsReadOut`: open state plus a computation that settles after the first open.
function InteractiveReadOut() {
    const [open, setOpen] = useState(false);
    const [requested, setRequested] = useState(false);
    const [resolved, setResolved] = useState(false);

    useEffect(() => {
        if (!requested) return;
        const timer = setTimeout(() => setResolved(true), RESOLVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [requested]);

    return (
        <BaseInstructionsReadOut
            count={ROWS.length}
            open={open}
            onToggle={() => {
                setOpen(!open);
                setRequested(true);
            }}
        >
            {ROWS.map((row, index) => (
                <BaseReadOutItem
                    key={index}
                    index={index}
                    programName={row.programName}
                    // "Unavailable" is known before any computation, as on the page; the rest waits for it.
                    state={resolved || row.state.status === 'unavailable' ? row.state : { status: 'loading' }}
                />
            ))}
        </BaseInstructionsReadOut>
    );
}
