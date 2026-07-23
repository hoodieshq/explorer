import { clsx } from 'clsx';
import * as React from 'react';

import { labelSize, type LabelSizeName, pxToRem, remStr } from './key-label-vgrid';

export interface KeyLabelProps extends Omit<React.ComponentProps<'span'>, 'style'> {
    /**
     * Text to render. A key label is text — nothing more.
     */
    children?: React.ReactNode;
    /**
     * A size token from the shared type scale (`xs`, `sm`, `base`, …). It presets the label's
     * geometry (`fontSize` + `lineHeight` from the scale) AND stamps `data-vgrid-size`, so the label
     * participates in the vertical-rhythm grid: dropped inside a `data-vgrid-row="R"` container, the
     * generated grid CSS gives it the `pt`/`pb` that make its box `R` tall and its baseline sit on the
     * row's shared line. Explicit `fontSize`/`lineHeight` still override the preset for one-offs.
     */
    size?: LabelSizeName;
    /**
     * Type size, in px.
     *
     * This is a *component* parameter, not a raw font declaration: it is part of the KeyLabel's public
     * geometry and drives the size of the glyphs the component renders. Callers reason about it as
     * "how big is this label", not "which font-size CSS did I set".
     */
    fontSize?: number;
    /**
     * Line-box height, in px (an absolute value, not a unitless multiplier).
     *
     * Also a *component* parameter rather than a font setting. It fixes the vertical space the label
     * occupies per line, independent of the glyph size — so labels with different `fontSize` values
     * still line up on the same baseline grid, and a wrapped label grows in exact `lineHeight`
     * increments.
     */
    lineHeight?: number;
    /**
     * Optional width cap, in px. When set, the label is bounded to this width and its text wraps
     * onto multiple lines (each line keeping the `lineHeight` box). When omitted, the label stays
     * on a single line.
     */
    maxWidth?: number;
    /** Escape hatch for one-off styling; merged after the component's own geometry. */
    style?: React.CSSProperties;
}

/**
 * A text label whose typographic box — `fontSize` and `lineHeight` — is expressed as component
 * parameters so it can be aligned on a shared grid. Give it a `maxWidth` to bound its width and let
 * the text wrap.
 */
export const KeyLabel = React.forwardRef<HTMLSpanElement, KeyLabelProps>(function KeyLabel(
    { children, size, fontSize, lineHeight, maxWidth, className, style, ...props },
    ref,
) {
    const constrained = maxWidth != undefined;
    // The `size` token presets geometry from the shared scale and ships it as `rem` (so it scales with
    // the user's base font-size and the vertical grid stays aligned). Explicit numeric `fontSize`/
    // `lineHeight` are a px escape hatch that overrides the preset; bare defaults (14/20 px) apply when
    // neither is given.
    const preset = size != undefined ? labelSize(size) : undefined;
    const fontSizeCss = fontSize != undefined ? `${fontSize}px` : preset ? remStr(pxToRem(preset.fontSize)) : '14px';
    const lineHeightCss = lineHeight != undefined ? `${lineHeight}px` : preset ? remStr(pxToRem(preset.lineHeight)) : '20px';

    return (
        <span
            ref={ref}
            data-slot="key-label"
            data-vgrid-size={size}
            className={clsx(
                'text-neutral-200',
                constrained
                    ? // Bounded width: allow wrapping, and break long unbroken tokens so the cap holds.
                      'block whitespace-normal break-words [overflow-wrap:anywhere]'
                    : // Unbounded: the label is a single line.
                      'inline-block whitespace-nowrap',
                className,
            )}
            style={{
                fontSize: fontSizeCss,
                lineHeight: lineHeightCss,
                ...(constrained ? { maxWidth: `${maxWidth}px` } : undefined),
                ...style,
            }}
            {...props}
        >
            {children}
        </span>
    );
});
