import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseCodeExample } from '../BaseCodeExample';
import {
    EXAMPLE_CLI_COMMAND,
    EXAMPLE_CLI_FOCUS,
    EXAMPLE_RUST_CODE,
    EXAMPLE_RUST_FOCUS,
    EXAMPLE_SQUADS_URL,
    EXAMPLE_SQUADS_VAULT_TRANSACTION,
    EXAMPLE_TYPESCRIPT_CODE,
    EXAMPLE_TYPESCRIPT_FOCUS,
} from '../inspector-examples';

const meta = {
    args: { code: EXAMPLE_CLI_COMMAND, focus: EXAMPLE_CLI_FOCUS, language: 'shell' },
    component: BaseCodeExample,
    parameters: {
        docs: {
            description: {
                component: [
                    'Code sample in the inspector instructions tabs. Everything except `focus` is dimmed, and `focus` gets a hand-drawn underline.',
                    '',
                    '## References',
                    '',
                    '- [BaseCodeBlock](?path=/docs/shared-codeblock-basecodeblock--docs) — caption, divider and code surface; `rendered` carries the highlighting',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Inspector/BaseCodeExample',
} satisfies Meta<typeof BaseCodeExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shell: Story = {};

export const Rust: Story = {
    args: { code: EXAMPLE_RUST_CODE, focus: EXAMPLE_RUST_FOCUS, language: 'rust' },
};

export const TypeScript: Story = {
    args: { code: EXAMPLE_TYPESCRIPT_CODE, focus: EXAMPLE_TYPESCRIPT_FOCUS, language: 'typescript' },
};

export const Url: Story = {
    args: { code: EXAMPLE_SQUADS_URL, focus: EXAMPLE_SQUADS_VAULT_TRANSACTION, language: 'url' },
};
