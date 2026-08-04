import type { Meta, StoryObj } from '@storybook-config/types';

import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

import { Badge } from './badge';
import { Button } from './button';
import { CollapsibleCard } from './collapsible-card';

const SampleContent = () => (
    <BaseTable ui="dashkit" variant="card" nowrap>
        <BaseTable.Head>
            <BaseTable.Row>
                <BaseTable.HeaderCell className="text-dk-gray-700">Name</BaseTable.HeaderCell>
                <BaseTable.HeaderCell className="text-dk-gray-700">Value</BaseTable.HeaderCell>
            </BaseTable.Row>
        </BaseTable.Head>
        <BaseTable.Body>
            <BaseTable.Row>
                <BaseTable.Cell>Account #1</BaseTable.Cell>
                <BaseTable.Cell className="text-right">Gzf3…k9Pq</BaseTable.Cell>
            </BaseTable.Row>
            <BaseTable.Row>
                <BaseTable.Cell>Account #2</BaseTable.Cell>
                <BaseTable.Cell className="text-right">5xRt…mN7v</BaseTable.Cell>
            </BaseTable.Row>
            <BaseTable.Row>
                <BaseTable.Cell>Account #3</BaseTable.Cell>
                <BaseTable.Cell className="text-right">BqWu…dL2j</BaseTable.Cell>
            </BaseTable.Row>
        </BaseTable.Body>
    </BaseTable>
);

const meta: Meta<typeof CollapsibleCard> = {
    argTypes: {
        collapsible: {
            control: 'boolean',
        },
        defaultExpanded: {
            control: 'boolean',
        },
        headingPlacement: {
            control: 'inline-radio',
            options: ['inside', 'lifted'],
        },
    },
    args: {
        title: 'Account List (3)',
    },
    component: CollapsibleCard,
    // Args-driven so the controls (headingPlacement, collapsible, …) actually re-render the card. In
    // `lifted` mode `children` supply their own surface, so wrap the sample in a `Card`; `inside` already
    // renders inside its own card, so the bare table is enough.
    render: ({ headingPlacement, ...args }) => (
        <CollapsibleCard {...args} headingPlacement={headingPlacement}>
            {headingPlacement === 'lifted' ? (
                <Card ui="dashkit">
                    <SampleContent />
                </Card>
            ) : (
                <SampleContent />
            )}
        </CollapsibleCard>
    ),
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/CollapsibleCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const StartsCollapsed: Story = {
    args: { defaultExpanded: false },
};

export const WithHeaderButtons: Story = {
    args: {
        headerButtons: (
            <Button ui="dashkit" variant="white" size="sm" className="mr-1.5 flex items-center">
                Raw
            </Button>
        ),
        title: 'Account Input(s) (3)',
    },
};

export const NonCollapsible: Story = {
    args: { collapsible: false, title: 'Token Balances' },
};

// `headingPlacement="lifted"` moves the title into an `<h2>` above the surface (a `<section>` with the
// toggle in the heading row) and lets `children` bring their own card — here a dashkit `Card`. This is
// the shape the domains card and the transaction `CollapsibleSection` share. Flip the `headingPlacement`
// control on any story to compare.
export const Lifted: Story = {
    args: { headingPlacement: 'lifted', title: 'Owned Domain Names' },
};

export const WithBadgeTitle: Story = {
    args: {
        title: (
            <>
                <Badge ui="dashkit" variant="success" className="mr-1.5">
                    #1
                </Badge>
                Token Program: Transfer
            </>
        ),
    },
};
