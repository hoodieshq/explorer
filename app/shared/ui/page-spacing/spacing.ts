// Design-system COMMON page-spacing tokens (`DSCOMMON_*`) — the canonical vertical/horizontal rhythm
// of a detail page (Transaction / Block / Account). Single source of truth: pages apply each token's
// `className`, and the Page Spacing story documents the per-tier values off the same objects.
//
// Project breakpoints: xs 375 / sm 576 / md 768 / lg 992 / xl 1200.

export type Bp = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Tier = 'mobile' | 'tablet' | 'desktop';

export const TIER_ORDER: Tier[] = ['mobile', 'tablet', 'desktop'];
export const TIER_LABEL: Record<Tier, string> = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' };

// Per-page tier boundaries: which breakpoints each tier covers ON THIS (detail) page. A different page
// can end mobile later or start desktop earlier — change this and every consumer follows. This page's
// spacing switches at `lg:`, so its mobile range runs through md and the wide values begin at lg.
export const TIER_BREAKPOINTS: Record<Tier, Bp[]> = {
    desktop: ['xl'],
    mobile: ['xs', 'sm', 'md'],
    tablet: ['lg'],
};

export function tierRange(t: Tier): string {
    const bps = TIER_BREAKPOINTS[t];
    return bps.length === 1 ? bps[0] : `${bps[0]}–${bps[bps.length - 1]}`;
}

// A spacing value at one tier: the px size, the Tailwind class producing it at that tier, and the fixed
// band height reproducing it visually in the story (band omitted for non-band gaps).
export type Val = { px: string; cls: string; band?: string };

// One spacing token. `className` is the responsive Tailwind class a page applies. `marginClassName` is
// the same size expressed as a per-element bottom margin, for gaps that a page applies as `mb-*` on the
// preceding block rather than as `space-y-*` on a wrapper. `values` holds the resolved per-tier sizes
// for the reference table.
export type Spacing = {
    name: string;
    label: string;
    className?: string;
    marginClassName?: string;
    values: Record<Tier, Val>;
};

export const DSCOMMON_PAGE_PADDING_X: Spacing = {
    className: 'px-4 lg:px-6',
    label: 'Page padding (horizontal)',
    name: 'DSCOMMON_PAGE_PADDING_X',
    values: {
        desktop: { cls: 'lg:px-6', px: '24px' },
        mobile: { cls: 'px-4', px: '16px' },
        tablet: { cls: 'lg:px-6', px: '24px' },
    },
};
export const DSCOMMON_BEFORE_HEADER: Spacing = {
    className: 'pt-3 lg:pt-5',
    label: 'Before header (page top)',
    name: 'DSCOMMON_BEFORE_HEADER',
    values: {
        desktop: { band: 'h-5', cls: 'lg:pt-5', px: '20px' },
        mobile: { band: 'h-3', cls: 'pt-3', px: '12px' },
        tablet: { band: 'h-5', cls: 'lg:pt-5', px: '20px' },
    },
};
export const DSCOMMON_EYEBROW_TO_TITLE: Spacing = {
    className: 'gap-1.5',
    label: 'Eyebrow → title',
    name: 'DSCOMMON_EYEBROW_TO_TITLE',
    values: {
        desktop: { cls: 'gap-1.5', px: '6px' },
        mobile: { cls: 'gap-1.5', px: '6px' },
        tablet: { cls: 'gap-1.5', px: '6px' },
    },
};
// The gap below the page header. Applied as the header wrapper's bottom margin; the header keeps only
// its top padding (the space above the eyebrow comes from DSCOMMON_BEFORE_HEADER + that top padding).
export const DSCOMMON_AFTER_HEADER: Spacing = {
    className: 'mb-9',
    label: 'After header → first block',
    name: 'DSCOMMON_AFTER_HEADER',
    values: {
        desktop: { band: 'h-9', cls: 'mb-9', px: '36px' },
        mobile: { band: 'h-9', cls: 'mb-9', px: '36px' },
        tablet: { band: 'h-9', cls: 'mb-9', px: '36px' },
    },
};
export const DSCOMMON_BETWEEN_BLOCKS: Spacing = {
    className: 'space-y-9 lg:space-y-12',
    label: 'Between blocks',
    marginClassName: 'mb-9 lg:mb-12',
    name: 'DSCOMMON_BETWEEN_BLOCKS',
    values: {
        desktop: { band: 'h-12', cls: 'lg:space-y-12', px: '48px' },
        mobile: { band: 'h-9', cls: 'space-y-9', px: '36px' },
        tablet: { band: 'h-12', cls: 'lg:space-y-12', px: '48px' },
    },
};

export const DSCOMMON_SPACINGS: Spacing[] = [
    DSCOMMON_PAGE_PADDING_X,
    DSCOMMON_BEFORE_HEADER,
    DSCOMMON_EYEBROW_TO_TITLE,
    DSCOMMON_AFTER_HEADER,
    DSCOMMON_BETWEEN_BLOCKS,
];

// A max-width token: the Tailwind class a page applies + its resolved value for the reference table.
export type SizeToken = { name: string; label: string; className: string; value: string };

// Content column max width — taken from the transaction page (`max-w-5xl`). Detail pages cap their
// content column at this width.
export const DSCOMMON_CONTENT_MAX_WIDTH_M: SizeToken = {
    className: 'max-w-5xl',
    label: 'Content column max width',
    name: 'DSCOMMON_CONTENT_MAX_WIDTH_M',
    value: '64rem (1024px)',
};

export const DSCOMMON_MAX_WIDTHS: SizeToken[] = [DSCOMMON_CONTENT_MAX_WIDTH_M];
