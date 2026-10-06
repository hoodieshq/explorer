import { shortenAddress } from '@entities/idl';
import { isAddress } from '@solana/kit';
import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { useEffect, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import type { ReadbackPart } from '../../model/display/build-readback';
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
                    "The one-line **Intent** above Execute on the Interact tab (the same word as the instruction cards use). Always visible, no accordion. Until every field is filled it asks for them; once the form is complete the SDK's own sentence takes over, with values formatted (e.g. lamports as SOL). The line under it always reads the same. No field list — the form above already is one.",
                    '',
                    '## References',
                    '',
                    'What the block is built from:',
                    '',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) (`size="sm"`) — the complete sentence, addresses shortened and linked.',
                    '',
                    '## Relies on',
                    '',
                    '`useInstructionReadback` feeds this component; the data comes from:',
                    '',
                    "1. **The instruction's intent template** in the program's IDL (sRFC 39 display metadata). An instruction without one gets no block at all.",
                    '2. **The form values**, watched as they change. The template is laid over them offline on every keystroke: typed values fill their slots, empty ones stay as named slots.',
                    '3. **`@codama/dynamic-instructions`**, once every field is filled, 150 ms after the last change: it builds the sentence along the same path as Execute (flatten, populate, normalize), so the sentence describes what would be sent. A value that does not encode yet keeps the filled template on screen.',
                    '4. **Zero RPC.** No account is read here, so formatting that needs chain data (e.g. token decimals) waits for the mainnet confirmation ([MainnetWarningDialog](?path=/docs/features-idl-interactive-idl-mainnetwarningdialog--docs)).',
                ].join('\n'),
            },
            groups: [
                {
                    prototype: 'Interactive',
                    states: ['Incomplete', 'FilledTemplate', 'Complete'],
                    title: 'Fill in the form',
                },
            ],
        },
    },
    tags: ['autodocs', 'test', 'clear-sign'],
    title: 'Features/IDL/Interactive IDL/BaseInstructionReadback',
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Fill the fields: slots fill as you type, and the SDK's sentence takes over once every field is filled. */
export const Interactive: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByLabelText('amount'), '1500000000');
        await userEvent.type(canvas.getByLabelText('source'), SOURCE);
        await userEvent.type(canvas.getByLabelText('destination'), DESTINATION);
        await expect(await canvas.findByTestId('intent-sentence')).toBeVisible();
    },
    render: () => <InteractiveReadback />,
};

/** The block asks for the fields until every one is filled, whatever is filled so far. */
export const Incomplete: Story = {
    args: {
        parts: [
            { kind: 'text', text: 'Transfer ' },
            { isAddress: false, kind: 'filled', name: 'amount', text: '1500000000' },
            { kind: 'text', text: ' from ' },
            { kind: 'missing', name: 'source' },
            { kind: 'text', text: ' to ' },
            { kind: 'missing', name: 'destination' },
        ],
    },
    name: 'Not every field filled: an empty form, or some fields filled',
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('Fill in all fields to see the intent.')).toBeVisible();
    },
};

/** Every field filled and no sentence from the SDK: the template stands in, with the values as typed. */
export const FilledTemplate: Story = {
    args: {
        parts: [
            { kind: 'text', text: 'Transfer ' },
            { isAddress: false, kind: 'filled', name: 'amount', text: '1500000000' },
            { kind: 'text', text: ' from ' },
            { isAddress: true, kind: 'filled', name: 'source', text: 'Gjzy5…X1GBv' },
            { kind: 'text', text: ' to ' },
            { isAddress: true, kind: 'filled', name: 'destination', text: 'EjYkr…hPE5M' },
        ],
    },
    name: 'Filled template: the sentence still on its way, a value that does not encode yet, or no sentence in the metadata',
};

export const Complete: Story = {
    args: {
        parts: [],
        sentence: `Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`,
    },
    name: "Complete: the SDK's sentence for a complete form",
};

const FIELDS = ['amount', 'source', 'destination'] as const;
type Field = (typeof FIELDS)[number];

// Long enough to see the filled template before the SDK's sentence replaces it.
const SENTENCE_DELAY_MS = 600;

// Stands in for `useInstructionReadback` under the Interact form: the template over the typed values, then the
// SDK's sentence (lamports formatted as SOL) once every field is filled.
function InteractiveReadback() {
    const [values, setValues] = useState<Record<Field, string>>({ amount: '', destination: '', source: '' });
    const [sentence, setSentence] = useState<string>();
    const complete = FIELDS.every(field => values[field].trim());

    useEffect(() => {
        setSentence(undefined);
        if (!complete) return;
        const timer = setTimeout(
            () =>
                setSentence(
                    `Transfer ${Number(values.amount) / 1e9} SOL from ${values.source.trim()} to ${values.destination.trim()}`,
                ),
            SENTENCE_DELAY_MS,
        );
        return () => clearTimeout(timer);
    }, [complete, values]);

    return (
        <div className="flex max-w-xl flex-col gap-4">
            <div className="flex flex-col gap-2">
                {FIELDS.map(field => (
                    <label key={field} className="flex flex-col gap-1 text-xs text-outer-space-300">
                        {field}
                        <input
                            aria-label={field}
                            value={values[field]}
                            onChange={event => setValues({ ...values, [field]: event.target.value })}
                            className="rounded border border-solid border-outer-space-800 bg-heavy-metal-900 px-2 py-1.5 font-mono text-sm text-white"
                        />
                    </label>
                ))}
            </div>
            <BaseInstructionReadback parts={toParts(values)} sentence={sentence} />
        </div>
    );
}

function toParts(values: Record<Field, string>): ReadbackPart[] {
    const slot = (name: Field): ReadbackPart => {
        const value = values[name].trim();
        if (!value) return { kind: 'missing', name };
        const address = isAddress(value);
        return { isAddress: address, kind: 'filled', name, text: address ? shortenAddress(value) : value };
    };
    return [
        { kind: 'text', text: 'Transfer ' },
        slot('amount'),
        { kind: 'text', text: ' from ' },
        slot('source'),
        { kind: 'text', text: ' to ' },
        slot('destination'),
    ];
}
