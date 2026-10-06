import { BaseInstructionCard } from '@components/common/BaseInstructionCard';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
    nextjsParameters,
    withClipboardMock,
    withCluster,
    withScrollAnchor,
    withTokenInfoBatch,
} from '@storybook-config/decorators';
import { GroupedDocsPage } from '@storybook-config/grouped-docs-page';
import type { Meta, StoryObj } from '@storybook-config/types';
import { useEffect, useId, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseTable } from '@/app/shared/ui/Table';

import type { InstructionIntentState } from '../../model/intent-state';
import { BaseInstructionIntentButton } from '../BaseInstructionIntentButton';
import { BaseInstructionIntentPanel } from '../BaseInstructionIntentPanel';
import { NO_SENTENCE_DISPLAY, TRANSFER_TOKENS_DISPLAY } from './intent-fixtures';

const meta: Meta<typeof BaseInstructionIntentPanel> = {
    component: BaseInstructionIntentPanel,
    decorators: [withCluster, withScrollAnchor, withTokenInfoBatch, withClipboardMock],
    globals: { viewport: { value: 'responsive' } },
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "The intent row of an instruction card in the Programs block, on the transaction page and in the Inspector. The **Intent** button in the card header ([BaseInstructionIntentButton](?path=/docs/features-decodeinstructionwithidl-baseinstructionintentbutton--docs)) opens it at the top of the card body. Inline rather than floating, so it pushes the card rows down instead of covering them. It shows the sentence only: the SDK's labelled fields repeat the card rows below. Every state of the on-demand computation has its own body: skeleton while resolving, the sentence once resolved, the short intent label when the metadata has no sentence, an error with Retry, and, when there is none, a note naming the reason: no intent metadata, no raw bytes, or an instruction the metadata does not describe.",
                    '',
                    '## References',
                    '',
                    'What the intent is built from: the row, and the toggle that opens it.',
                    '',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) (`size="sm"`) — the sentence, addresses shortened and linked.',
                    '- [Skeleton](?path=/docs/components-shared-skeleton--docs) — the loading lines.',
                    '- [Button](?path=/docs/components-shared-button--docs) (`variant="outline" size="sm"`) — Retry.',
                    '- [BaseInstructionIntentButton](?path=/docs/features-decodeinstructionwithidl-baseinstructionintentbutton--docs) — the Intent toggle in the card header that opens the row. When the intent cannot be had (no metadata, no bytes, not identified, or failed to load) it turns **dashed**, with a dimmed label, at the same size ([Button](?path=/story/components-shared-button--dashkit-toggle-dashed) `dashed`); see **Missing** and **MissingOpen** there.',
                    '- [BaseInstructionCard](?path=/docs/components-common-baseinstructioncard--docs) `bodyTop` (and the same row in `InspectorInstructionCard`) — where the row sits: a full-width row at the top of the card body, above the Program and account rows.',
                    '- [CollapsibleCard](?path=/story/components-shared-collapsiblecard--without-header-divider) `headerDivider={false}` — the card drops the line under its header while the row shows, since the row draws its own top edge.',
                    '- [Palette → Agreements](?path=/story/design-system-palette--agreements) — the danger colour (`dk-danger`) of the error label and its tinted ground.',
                    '',
                    '## Relies on',
                    '',
                    '`useInstructionIntentSlots` pairs the button and this row; the data comes from:',
                    '',
                    "1. **The instruction's wire bytes.** In the Inspector the card has them. On the transaction page the card reads them off the instruction when it carries them, otherwise the first open fetches the raw transaction. That fetch carries top-level instructions only, so an inner instruction without bytes stays unavailable. If the fetch fails, the intent settles as having no bytes (dashed button) instead of waiting; the Raw view keeps its retry, and bytes it brings reach the intent too.",
                    "2. **The program's IDL from Program Metadata**, carrying sRFC 39 display metadata. Once the IDL is in, a missing intent is known before any click: the button turns dashed, and this row says why.",
                    '3. **`@codama/dynamic-instructions`** builds the sentence from the IDL and the bytes. It may read live accounts over RPC (e.g. mint decimals); the row then says the data may differ from the time of the transaction.',
                    "4. **Computed on the first open only** and cached for the page's lifetime, keyed by cluster and bytes. The cache is shared with **What this transaction does** ([BaseInstructionsReadOut](?path=/docs/features-decodeinstructionwithidl-baseinstructionsreadout--docs)), so reading one after the other costs nothing.",
                    '5. **The current cluster**: the IDL and the RPC reads come from it.',
                ].join('\n'),
            },
            page: () => (
                <GroupedDocsPage
                    groups={[
                        {
                            prototype: Interactive,
                            states: [Loading, Resolved, ResolvedWithAccountData, NoSentence],
                            title: 'Intent found: solid button',
                        },
                        {
                            prototype: InteractiveUnavailable,
                            states: [NoMetadata, NoBytes, NotIdentified, LoadFailed],
                            title: 'Intent unavailable: dashed button',
                        },
                    ]}
                />
            ),
        },
    },
    tags: ['autodocs', 'test', 'clear-sign'],
    title: 'Features/DecodeInstructionWithIdl/BaseInstructionIntentPanel',
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * In an instruction card: the Intent button opens and closes the row; the first open computes, later opens read the cache.
 * The stories after it are the answers that keep the button solid: loading, resolved, resolved with live account
 * data, resolved without a sentence.
 */
export const Interactive: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTestId('instruction-intent-trigger'));
        await expect(await canvas.findByTestId('intent-sentence')).toBeVisible();
    },
    render: () => <InteractiveIntentCard />,
};

export const Loading: Story = {
    args: { state: { status: 'loading' } },
    name: 'Loading: the intent computing, or the raw transaction loading for its bytes',
};

export const Resolved: Story = {
    args: { state: { display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('intent-sentence')).toHaveTextContent('Transfer 100000000 base units from');
        await expect(canvas.queryByTestId('intent-fields')).not.toBeInTheDocument();
    },
};

/** The SDK read live account state, which may differ from the state at the transaction's slot. */
export const ResolvedWithAccountData: Story = {
    args: { state: { display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: true } },
};

export const NoSentence: Story = {
    args: { state: { display: NO_SENTENCE_DISPLAY, status: 'resolved', usedAccountData: false } },
};

/**
 * A program without intent metadata: known as soon as its IDL arrives, so the button is dashed before any click,
 * and opening it shows why at once, with nothing to compute. The stories after it are the answers that make the button
 * dashed: no metadata, no bytes (also after a failed raw-transaction fetch), an instruction the metadata does not
 * describe, and a failed load with Retry. The last two are found only by computing, so their button turns dashed once
 * opened.
 */
export const InteractiveUnavailable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: 'Intent unavailable' });
        await expect(trigger.className).toContain('border-dashed');
        await userEvent.click(trigger);
        await expect(canvas.getByTestId('instruction-intent-unavailable')).toHaveTextContent(
            "doesn't publish intent metadata",
        );
    },
    render: () => <InteractiveIntentCard unavailable />,
};

/** The card still offers the button and says why it is empty. */
export const NoMetadata: Story = {
    args: { state: { reason: 'no-metadata', status: 'unavailable' } },
    name: 'No metadata: no IDL in Program Metadata, or an IDL without intent metadata',
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-unavailable')).toHaveTextContent(
            "Couldn't get the intent",
        );
    },
};

export const NoBytes: Story = {
    args: { state: { reason: 'no-bytes', status: 'unavailable' } },
    name: 'No bytes: the RPC returned the instruction decoded, or the raw transaction failed to load',
};

export const NotIdentified: Story = {
    args: { state: { reason: 'not-identified', status: 'unavailable' } },
};

export const LoadFailed: Story = {
    args: { state: { retry: fn(), status: 'error' } },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Retry' }));
        await expect((args.state as { retry: () => void }).retry).toHaveBeenCalled();
    },
};

const TRANSFER_IX = new TransactionInstruction({
    data: Buffer.from([3, 0, 225, 245, 5, 0, 0, 0, 0]),
    keys: [{ isSigner: true, isWritable: true, pubkey: new PublicKey('11111111111111111111111111111111') }],
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
});

// Long enough to see the skeleton the card shows while the SDK computes, short enough not to stall a click-through.
const RESOLVE_DELAY_MS = 900;

// Stands in for `useInstructionIntentSlots` inside `InstructionCard`: open state plus a computation that settles
// after the first open. `unavailable`: the program publishes no intent metadata, which is known before any click.
function InteractiveIntentCard({ unavailable = false }: { unavailable?: boolean }) {
    const panelId = useId();
    const [open, setOpen] = useState(false);
    const [resolved, setResolved] = useState(false);

    useEffect(() => {
        if (!open || resolved || unavailable) return;
        const timer = setTimeout(() => setResolved(true), RESOLVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [open, resolved, unavailable]);

    const state: Exclude<InstructionIntentState, { status: 'idle' }> = unavailable
        ? { reason: 'no-metadata', status: 'unavailable' }
        : resolved
          ? { display: TRANSFER_TOKENS_DISPLAY, status: 'resolved', usedAccountData: true }
          : { status: 'loading' };

    return (
        <BaseInstructionCard
            index={0}
            ix={TRANSFER_IX}
            result={{ err: null }}
            title={unavailable ? 'Unknown Program: Unknown Instruction' : 'Token Program: Transfer'}
            headerButtons={
                <BaseInstructionIntentButton
                    open={open}
                    busy={open && state.status === 'loading'}
                    missing={unavailable}
                    controls={panelId}
                    onClick={() => setOpen(!open)}
                />
            }
            bodyTop={open ? <BaseInstructionIntentPanel id={panelId} state={state} /> : undefined}
        >
            <BaseTable.Row>
                <BaseTable.Cell>Program</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    {unavailable ? 'Unknown Program' : 'Token Program'}
                </BaseTable.Cell>
            </BaseTable.Row>
            <BaseTable.Row>
                <BaseTable.Cell>{unavailable ? 'Data' : 'Amount'}</BaseTable.Cell>
                <BaseTable.Cell className="text-right">{unavailable ? '03 00 e1 f5 05' : '100000000'}</BaseTable.Cell>
            </BaseTable.Row>
        </BaseInstructionCard>
    );
}
