import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { fn } from 'storybook/test';

import { BaseInstructionsReadOut, BaseReadOutItem } from '../BaseInstructionsReadOut';
import { TRANSFER_TOKENS_DISPLAY } from './intent-fixtures';

const COMPUTE_LIMIT = {
    fields: [{ label: 'Units', value: '450000' }],
    intent: 'Set compute unit limit',
    interpolatedIntent: 'Set the compute unit limit to 450000',
};

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
                    "**Intents** in the Inspector's Overview: every instruction's intent sentence, in order, behind one click — the Inspector's equivalent of a hardware wallet's review screen. Instructions without an intent keep their row, named by their program as the instruction cards name it, so the count always matches the transaction.",
                    '',
                    '## References',
                    '',
                    '- [Button](?path=/docs/components-shared-button--docs) (`variant="outline" size="sm"`) — Intents / Hide.',
                    '- [Badge](?path=/docs/components-shared-badge--docs) (`variant="success"`) — the instruction number, matching the cards below.',
                    '- [BaseIntentSentence](?path=/docs/entities-idl-baseintentsentence--docs) — each resolved sentence.',
                    '- [Skeleton](?path=/docs/components-shared-skeleton--docs) — rows still resolving.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/DecodeInstructionWithIdl/BaseInstructionsReadOut',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = { args: { open: false } };

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
            <BaseReadOutItem
                key={3}
                index={3}
                programName="Unknown Program (Bz4AoAXL8vkTSFPqR52GwNxFixAbKPJ3VShhgoS2eV2G)"
                state={{ reason: 'no-metadata', status: 'unavailable' }}
            />,
        ],
        open: true,
    },
};
