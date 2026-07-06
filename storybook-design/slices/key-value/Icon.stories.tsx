import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';
import { HelpCircle } from 'react-feather';

import { Icon } from './Icon';
import { Label } from './Label';
import { ICON_SHIM } from './tokens';

const meta = {
    component: Icon,
    title: 'Design Slices/key-value/Icon',
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { children: <HelpCircle />, size: 's' } };
export const Medium: Story = { args: { children: <HelpCircle />, size: 'm' } };
export const Large: Story = { args: { children: <HelpCircle />, size: 'l' } };
export const XLarge: Story = { args: { children: <HelpCircle />, size: 'xl' } };

// Every size dropped into every standardized line-box. The outlined box shows the padded
// line-box the icon occupies; the icon should stay optically centered within each line-box.
export const SizesAndLineBoxes: Story = {
    args: { children: <HelpCircle /> },
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
                        ICON_SHIM[size][lb] ? (
                            <div key={`${size}-${lb}`} className="outline outline-1 outline-dark-border">
                                <Icon size={size} lineBox={lb}>
                                    <HelpCircle />
                                </Icon>
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

// Alignment check: an Icon and a same-size Label placed side by side in each line-box. Because
// both are line-box-tall boxes that position their content on the shared grid, the icon's center
// should sit on the label text's optical center. Tune ICON_SHIM in tokens.ts until they coincide.
export const WithLabel: Story = {
    args: { children: <HelpCircle /> },
    render: () => (
        <div className="inline-grid grid-cols-[auto_repeat(4,auto)] items-center gap-x-10 gap-y-4 text-dk-white">
            <div />
            {(['s', 'm', 'l', 'xl'] as const).map(size => (
                <div key={size} className="text-dk-sm text-dk-gray-700">
                    size {size}
                </div>
            ))}
            {([16, 20, 24, 32, 36, 40] as const).map(lb => (
                <React.Fragment key={lb}>
                    <div className="text-dk-sm text-dk-gray-700">line-box {lb}</div>
                    {(['s', 'm', 'l', 'xl'] as const).map(size =>
                        ICON_SHIM[size][lb] ? (
                            <div
                                key={`${size}-${lb}`}
                                className="flex items-start gap-1.5 outline outline-1 outline-dark-border"
                            >
                                <Icon size={size} lineBox={lb}>
                                    <HelpCircle />
                                </Icon>
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
