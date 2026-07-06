import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';
import { CheckCircle, Clock, HelpCircle, Key } from 'react-feather';

import { KeyValue } from './KeyValue';

const meta = {
    component: KeyValue,
    parameters: { layout: 'padded' },
    title: 'Design Slices/key-value/KeyValue',
} satisfies Meta<typeof KeyValue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
    args: {
        children: <span className="font-mono">TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</span>,
        label: 'Address',
    },
};

// A label with a leading icon. The icon rides in its own wrapper (Icon), so it's positioned
// once against the label's line-box — no per-row alignment tweaks.
export const WithIcon: Story = {
    args: {
        children: <span className="font-mono">TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</span>,
        icon: <Key />,
        label: 'Address',
    },
};

// A stack of rows — the shared "Overview" card shape. Mixed value heights (mono, badge,
// plain) all keep the label baseline aligned to the value's first line.
export const Stack: Story = {
    args: { children: null, label: '' },
    render: () => (
        <div className="max-w-3xl rounded-lg border border-solid border-dk-card-outline-dark bg-dk-gray-800-dark">
            <KeyValue label="Address">
                <span className="font-mono">TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</span>
            </KeyValue>
            <KeyValue label="Balance (SOL)">
                <span className="font-mono">◎5.542247638</span>
            </KeyValue>
            <KeyValue label="Executable">Yes</KeyValue>
            <KeyValue label="Verified Build">
                <span className="rounded bg-dk-warning-on-dark/20 px-2 py-0.5 text-dk-warning-on-dark">
                    Program Not Verified
                </span>
            </KeyValue>
            <KeyValue label="Last Deployed Slot">
                <span className="font-mono">312,456,789</span>
            </KeyValue>
        </div>
    ),
};

// A stack where every row's label carries an icon. Icons and label text stay on one grid, and
// because every row uses the same `labelWidth`, the label columns are equal-length and the
// values line up in a single column.
export const IconsAndEqualWidth: Story = {
    args: { children: null, label: '' },
    render: () => (
        <div className="max-w-3xl rounded-lg border border-solid border-dk-card-outline-dark bg-dk-gray-800-dark">
            <KeyValue label="Address" icon={<Key />}>
                <span className="font-mono">TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</span>
            </KeyValue>
            <KeyValue label="Verified Build" icon={<CheckCircle />}>
                <span className="rounded bg-dk-warning-on-dark/20 px-2 py-0.5 text-dk-warning-on-dark">
                    Program Not Verified
                </span>
            </KeyValue>
            <KeyValue label="Upgrade Authority" icon={<HelpCircle />}>
                <span className="font-mono">2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9</span>
            </KeyValue>
            <KeyValue label="Last Deployed Slot" icon={<Clock />}>
                <span className="font-mono">312,456,789</span>
            </KeyValue>
        </div>
    ),
};

// The label column width is a prop. Passing the same wider `labelWidth` to every row keeps the
// labels equal-length at a custom width and the values aligned.
export const CustomLabelWidth: Story = {
    args: { children: null, label: '' },
    render: () => (
        <div className="max-w-3xl rounded-lg border border-solid border-dk-card-outline-dark bg-dk-gray-800-dark">
            <KeyValue label="Address" labelWidth="sm:w-80">
                <span className="font-mono">TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</span>
            </KeyValue>
            <KeyValue label="Program Upgrade Authority" labelWidth="sm:w-80">
                <span className="font-mono">2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9</span>
            </KeyValue>
            <KeyValue label="Last Deployed Slot" labelWidth="sm:w-80">
                <span className="font-mono">312,456,789</span>
            </KeyValue>
        </div>
    ),
};
