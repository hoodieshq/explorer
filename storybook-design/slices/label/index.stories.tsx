import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';
import { expect, within } from 'storybook/test';

import { BoxModelInspector } from './box-model-inspector';
import { KeyLabel } from './key-label';
import { ROW_SIZES, sizesFitting, vgridCss } from './key-label-vgrid';

const meta: Meta<typeof KeyLabel> = {
    argTypes: {
        fontSize: { control: { max: 48, min: 8, step: 1, type: 'range' } },
        lineHeight: { control: { max: 64, min: 8, step: 1, type: 'range' } },
        maxWidth: { control: { max: 480, min: 40, step: 8, type: 'range' } },
    },
    component: KeyLabel,
    decorators: [
        Story => (
            <div className="flex min-h-96 w-full max-w-3xl flex-col gap-8 p-8 text-white">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs', 'test'],
    title: 'Design Slices/KeyLabel',
};

export default meta;
type Story = StoryObj<typeof meta>;

// A faint horizontal ruling every `lineHeight` px, so you can see that the label's line-box — not
// its glyphs — is what snaps to the grid.
function GridBackdrop({ lineHeight, children }: { lineHeight: number; children: React.ReactNode }) {
    return (
        <div
            className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
            style={{
                backgroundImage: `repeating-linear-gradient(
                    to bottom,
                    rgba(255,255,255,0.10) 0,
                    rgba(255,255,255,0.10) 1px,
                    transparent 1px,
                    transparent ${lineHeight}px
                )`,
                backgroundPosition: '0 16px',
            }}
        >
            {children}
        </div>
    );
}

/**
 * Interactive playground. A collapsible box-model inspector on top drives the visualisation, and
 * below it the whole Tailwind type scale is laid out per line-height (every size that fits,
 * `fontSize <= lineHeight`, labelled with its Tailwind name) — with the inspector overlaying each
 * label's box-model layers.
 */
export const Playground: Story = {
    parameters: { controls: { disable: true } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Inspector')).toBeInTheDocument();
    },
    render: () => <BoxModelInspector />,
};

/**
 * `fontSize` and `lineHeight` are parameters of the component, not of the text. Three labels with
 * different type sizes but the SAME `lineHeight` (28px) all occupy the same row height, so their
 * line-boxes align to the grid regardless of glyph size.
 */
export const LineHeightAsGrid: Story = {
    render: () => (
        <GridBackdrop lineHeight={28}>
            <div className="flex flex-col">
                <KeyLabel fontSize={12} lineHeight={28}>
                    12px text · 28px line-box
                </KeyLabel>
                <KeyLabel fontSize={18} lineHeight={28}>
                    18px text · 28px line-box
                </KeyLabel>
                <KeyLabel fontSize={24} lineHeight={28}>
                    24px text · 28px line-box
                </KeyLabel>
            </div>
        </GridBackdrop>
    ),
};

/**
 * The same `fontSize` (16px) rendered at two different `lineHeight` values. The glyphs are
 * identical; only the component's box changes — proving line-height belongs to the component.
 */
export const SameFontDifferentBox: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <GridBackdrop lineHeight={20}>
                <KeyLabel fontSize={16} lineHeight={20}>
                    16px text · tight 20px box
                </KeyLabel>
            </GridBackdrop>
            <GridBackdrop lineHeight={40}>
                <KeyLabel fontSize={16} lineHeight={40}>
                    16px text · airy 40px box
                </KeyLabel>
            </GridBackdrop>
        </div>
    ),
};

/**
 * The vertical-rhythm grid applied for real — with ZERO runtime JS. `vgridCss()` turns the tuned
 * `KEY_LABEL_VGRID` values into a stylesheet; each row is a plain `flex flex-wrap` container that
 * declares its rhythm via `data-vgrid-row`, and each `KeyLabel` carries only its `size`. The
 * generated CSS supplies the `pt`/`pb` by cascade, so every cube in a row is exactly `R` tall and
 * its baseline sits on the row's shared line. This is what you ship; the Playground is only the
 * tool that produces these numbers.
 */
export const GridApplied: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            {/* One stylesheet, generated from the source-of-truth values. Loaded once. */}
            <style>{vgridCss()}</style>
            {ROW_SIZES.map(row => (
                <div key={row} className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-white/40">row {row}px</span>
                    {/* Free container: height hugs the cubes, width stretches to the parent. The dashed
                        frame just marks the box — it imposes no height. */}
                    <div
                        data-vgrid-row={row}
                        className="flex flex-wrap items-start gap-x-5 rounded-lg border border-dashed border-white/15"
                    >
                        {sizesFitting(row).map(s => (
                            <KeyLabel key={s.name} size={s.name}>
                                {s.name}
                            </KeyLabel>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    ),
};

/**
 * Give the label a `maxWidth` and its text wraps onto multiple lines — each line keeping the same
 * `lineHeight` box, so a two-line label is exactly twice as tall as a one-line label.
 */
export const ConstrainedWidthWraps: Story = {
    render: () => (
        <div className="flex flex-wrap items-start gap-6">
            <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-white/40">unbounded (one line)</span>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <KeyLabel fontSize={14} lineHeight={22}>
                        Instruction data for the token transfer
                    </KeyLabel>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-white/40">maxWidth = 160 (wraps)</span>
                <GridBackdrop lineHeight={22}>
                    <KeyLabel fontSize={14} lineHeight={22} maxWidth={160}>
                        Instruction data for the token transfer
                    </KeyLabel>
                </GridBackdrop>
            </div>
        </div>
    ),
};
