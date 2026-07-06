import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { Label } from './Label';
import { LABEL_SHIM } from './tokens';

const meta = {
    component: Label,
    title: 'Design Slices/key-value/Label',
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { children: 'Address', size: 's' } };
export const Medium: Story = { args: { children: 'Address', size: 'm' } };
export const Large: Story = { args: { children: 'Address', size: 'l' } };
export const XLarge: Story = { args: { children: 'Address', size: 'xl' } };

// Every size dropped into every standardized line-box (20 / 24 / 32). The outlined box
// shows the padded line-box the label occupies; the text should keep a consistent baseline
// within each line-box column.
export const SizesAndLineBoxes: Story = {
    args: { children: 'Label' },
    render: () => (
        <div className="inline-grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-x-8 gap-y-4 text-dk-white">
            <div />
            {([16, 20, 24, 32, 36, 40] as const).map(lb => (
                <div key={lb} className="text-dk-sm text-dk-gray-700">
                    line-box {lb}
                </div>
            ))}
            {(['s', 'm', 'l', 'xl'] as const).map(size => (
                <React.Fragment key={size}>
                    <div className="text-dk-sm text-dk-gray-700">size {size}</div>
                    {([16, 20, 24, 32, 36, 40] as const).map(lb =>
                        LABEL_SHIM[size][lb] ? (
                            <div key={`${size}-${lb}`} className="outline outline-1 outline-dark-border">
                                <Label size={size} lineBox={lb}>
                                    Verified Build
                                </Label>
                            </div>
                        ) : (
                            <div key={`${size}-${lb}`} className="text-dk-sm text-dk-gray-700">
                                —
                            </div>
                        ),
                    )}
                </React.Fragment>
            ))}
        </div>
    ),
};
