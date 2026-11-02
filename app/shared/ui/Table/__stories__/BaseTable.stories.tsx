import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseCard, BaseCardBody, BaseCardHeader, BaseCardTitle } from '../../Card';
import { BaseTable } from '../BaseTable';

const meta: Meta<typeof BaseTable> = {
    argTypes: {
        body: {
            control: 'inline-radio',
            description: 'Data row styling. `subtle` sets 8px vertical / 12px horizontal cell padding.',
            options: ['default', 'subtle'],
        },
        columns: {
            control: 'inline-radio',
            description:
                'Column layout. `label-value` gives a head-less name / value table a name column of 35% / 25% / 30% of the row (below md / from md / from xxl) and lets names and values wrap.',
            options: ['default', 'label-value'],
        },
        density: {
            control: 'inline-radio',
            description:
                'Cell spacing. `dense` sets 12px horizontal / 10px vertical padding with top-aligned content — the inspector card tables. `even` sets 12px on every side with cells on one baseline — the instruction cards.',
            options: ['default', 'dense', 'even'],
        },
        head: {
            control: 'inline-radio',
            description:
                'Header row styling. `subtle` uses the Token Balances header colour, a transparent (row-matching) background, and 8px/12px padding.',
            options: ['default', 'subtle'],
        },
        labels: {
            control: 'inline-radio',
            description:
                'Name colour. `muted` takes the transaction Summary label colour; section rows keep their own.',
            options: ['default', 'muted'],
        },
        nowrap: { control: 'boolean' },
        ui: { control: 'inline-radio', options: ['dashkit', 'tw'] },
        variant: { control: 'inline-radio', options: ['plain', 'card'] },
    },
    component: BaseTable,
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/Table/BaseTable',
};

export default meta;
type Story = StoryObj<typeof meta>;

const SampleRows = () => (
    <>
        <BaseTable.Head>
            <BaseTable.Row>
                <BaseTable.HeaderCell>Label</BaseTable.HeaderCell>
                <BaseTable.HeaderCell>Value</BaseTable.HeaderCell>
            </BaseTable.Row>
        </BaseTable.Head>
        <BaseTable.Body>
            <BaseTable.Row>
                <BaseTable.Cell>Slot</BaseTable.Cell>
                <BaseTable.Cell>123,456</BaseTable.Cell>
            </BaseTable.Row>
            <BaseTable.Row>
                <BaseTable.Cell>Epoch</BaseTable.Cell>
                <BaseTable.Cell>789</BaseTable.Cell>
            </BaseTable.Row>
        </BaseTable.Body>
    </>
);

const CardSampleRows = () => (
    <>
        <BaseTable.Head>
            <BaseTable.Row>
                <BaseTable.HeaderCell>Address</BaseTable.HeaderCell>
                <BaseTable.HeaderCell>Balance</BaseTable.HeaderCell>
            </BaseTable.Row>
        </BaseTable.Head>
        <BaseTable.Body>
            <BaseTable.Row>
                <BaseTable.Cell>11111111111111111111111111111111</BaseTable.Cell>
                <BaseTable.Cell>4.2 SOL</BaseTable.Cell>
            </BaseTable.Row>
            <BaseTable.Row>
                <BaseTable.Cell>TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</BaseTable.Cell>
                <BaseTable.Cell>0 SOL</BaseTable.Cell>
            </BaseTable.Row>
        </BaseTable.Body>
    </>
);

export const Dashkit: Story = {
    args: { ui: 'dashkit' },
    render: args => (
        <BaseTable {...args}>
            <SampleRows />
        </BaseTable>
    ),
};

export const DashkitNowrap: Story = {
    args: { nowrap: true, ui: 'dashkit' },
    render: args => (
        <BaseTable {...args}>
            <SampleRows />
        </BaseTable>
    ),
};

export const Tw: Story = {
    args: { ui: 'tw' },
    render: args => (
        <BaseTable {...args}>
            <SampleRows />
        </BaseTable>
    ),
};

export const TwNowrap: Story = {
    args: { nowrap: true, ui: 'tw' },
    render: args => (
        <BaseTable {...args}>
            <SampleRows />
        </BaseTable>
    ),
};

// `variant="card"` wraps the table in a `table-responsive` div and adds the dashkit `.card-table`
// styling (zero thead border-top, first/last cell padding aligned with card edges).
export const DashkitCard: Story = {
    args: { ui: 'dashkit', variant: 'card' },
    name: 'Dashkit / Card variant',
    render: args => (
        <BaseTable {...args}>
            <CardSampleRows />
        </BaseTable>
    ),
};

export const DashkitCardNowrap: Story = {
    args: { nowrap: true, ui: 'dashkit', variant: 'card' },
    name: 'Dashkit / Card variant + nowrap',
    render: args => (
        <BaseTable {...args}>
            <CardSampleRows />
        </BaseTable>
    ),
};

export const DashkitCardInsideCard: Story = {
    args: { nowrap: true, ui: 'dashkit', variant: 'card' },
    name: 'Dashkit / Card variant inside <BaseCard>',
    render: args => (
        <BaseCard ui="dashkit">
            <BaseCardHeader ui="dashkit">
                <BaseCardTitle ui="dashkit">Top Accounts</BaseCardTitle>
            </BaseCardHeader>
            <BaseCardBody ui="dashkit" className="p-0">
                <BaseTable {...args}>
                    <CardSampleRows />
                </BaseTable>
            </BaseCardBody>
        </BaseCard>
    ),
};

// `head="subtle"` restyles just the header row (muted `outer-space-300` colour, transparent row-matching
// background, 8px/12px padding), matching the transaction Token Balances header. Flip the `head` control
// to compare with `default`.
export const DashkitCardSubtleHead: Story = {
    args: { head: 'subtle', nowrap: true, ui: 'dashkit', variant: 'card' },
    name: 'Dashkit / Card variant + subtle head',
    render: args => (
        <BaseTable {...args}>
            <CardSampleRows />
        </BaseTable>
    ),
};

// The domain-list combination: `subtle` header + `subtle` rows (row-matching header background, muted
// header colour, uniform 8px/12px padding across header and body). Flip `head`/`body` to compare.
export const DashkitCardSubtleHeadAndBody: Story = {
    args: { body: 'subtle', head: 'subtle', nowrap: true, ui: 'dashkit', variant: 'card' },
    name: 'Dashkit / Card variant + subtle head & body',
    render: args => (
        <BaseTable {...args}>
            <CardSampleRows />
        </BaseTable>
    ),
};

// `density="dense"` tightens every cell to 12px horizontal / 10px vertical padding with content
// top-aligned — the compact spacing the inspector's Signatures / simulation-log card tables use. Flip
// the `density` control to compare with `default`.
export const DashkitCardDense: Story = {
    args: { density: 'dense', nowrap: true, ui: 'dashkit', variant: 'card' },
    name: 'Dashkit / Card variant + dense',
    render: args => (
        <BaseTable {...args}>
            <CardSampleRows />
        </BaseTable>
    ),
};

// `density="even"` + `columns="label-value"` + `labels="muted"` — the instruction card table: 12px on
// every side, one baseline per row, a muted name column of a fixed share of the row, wrapping values.
export const DashkitCardLabelValue: Story = {
    args: {
        columns: 'label-value',
        density: 'even',
        labels: 'muted',
        nowrap: true,
        ui: 'dashkit',
        variant: 'card',
    },
    name: 'Dashkit / Card variant + label-value',
    render: args => (
        <BaseTable {...args}>
            <BaseTable.Body>
                <BaseTable.Row>
                    <BaseTable.Cell>Program</BaseTable.Cell>
                    <BaseTable.Cell>ComputeBudget111111111111111111111111111111</BaseTable.Cell>
                </BaseTable.Row>
                <BaseTable.SectionRow>
                    <BaseTable.Cell>Account Name</BaseTable.Cell>
                    <BaseTable.Cell>Address</BaseTable.Cell>
                </BaseTable.SectionRow>
                <BaseTable.Row>
                    <BaseTable.Cell>MaximumPendingBalanceCreditCounter</BaseTable.Cell>
                    <BaseTable.Cell>TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</BaseTable.Cell>
                </BaseTable.Row>
                <BaseTable.Row>
                    <BaseTable.Cell colSpan={2}>A full-width cell for nested content</BaseTable.Cell>
                </BaseTable.Row>
            </BaseTable.Body>
        </BaseTable>
    ),
};

export const TwCard: Story = {
    args: { ui: 'tw', variant: 'card' },
    name: 'Tw / Card variant',
    render: args => (
        <BaseTable {...args}>
            <CardSampleRows />
        </BaseTable>
    ),
};

export const TwCardNowrap: Story = {
    args: { nowrap: true, ui: 'tw', variant: 'card' },
    name: 'Tw / Card variant + nowrap',
    render: args => (
        <BaseTable {...args}>
            <CardSampleRows />
        </BaseTable>
    ),
};
