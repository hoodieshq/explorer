import { Description, Title } from '@storybook/addon-docs/blocks';
import type { Meta, StoryObj } from '@storybook-config/types';

const meta: Meta = {
    parameters: {
        docs: {
            description: {
                component: [
                    "Clear Sign shows what an instruction does as one sentence, built from the program's sRFC 39 display metadata. It appears in four places; read the pages in this order:",
                    '',
                    "1. [What this transaction does](?path=/docs/features-decodeinstructionwithidl-baseinstructionsreadout--docs) — every instruction's intent at the bottom of the Summary card (transaction page) and the Overview card (Inspector).",
                    '2. [Intent in an instruction card](?path=/docs/features-decodeinstructionwithidl-baseinstructionintentpanel--docs) — the row the **Intent** button opens in the Programs block; the [button](?path=/docs/features-decodeinstructionwithidl-baseinstructionintentbutton--docs) turns dashed when there is no intent to show.',
                    '3. [Intent under the Interact form](?path=/docs/features-idl-interactive-idl-baseinstructionreadback--docs) — the sentence that fills in as the form does, on the program page.',
                    '4. [Mainnet confirmation](?path=/docs/features-idl-interactive-idl-mainnetwarningdialog--docs) — what is about to be signed, before Execute on mainnet.',
                    '',
                    'All four render the sentence with [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs).',
                    '',
                    'Each page lists what the block is built from (**References**) and where its data comes from (**Relies on**), and starts with an **Interactive** story to click through. To see only these pages, filter the sidebar by the `clear-sign` tag.',
                ].join('\n'),
            },
            page: () => (
                <>
                    <Title />
                    <Description />
                </>
            ),
        },
    },
    tags: ['autodocs', 'clear-sign'],
    title: 'Task Guides/HOO-1587 Clear Sign',
};

export default meta;
type Story = StoryObj<typeof meta>;

// CSF needs a story for the docs entry to exist; `!dev` keeps it out of the sidebar, so only the guide shows.
export const Guide: Story = {
    render: () => <></>,
    tags: ['!dev', '!test'],
};
