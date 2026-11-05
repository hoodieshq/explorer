import { Button } from '@components/shared/ui/button';
import { DialogClose, DialogTitle } from '@components/shared/ui/dialog';
import { cn } from '@components/shared/utils';
import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';
import { ChevronDown, Code, ExternalLink as ExternalLinkIcon, List, X } from 'react-feather';

import { JsonViewer } from '@/app/components/common/JsonViewer';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import {
    getAnchorId,
    useTokenExtensionNavigation,
} from '@/app/features/token-extensions/use-token-extension-navigation';
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';
import { Card } from '@/app/shared/ui/Card';
import { Drawer } from '@/app/shared/ui/drawer';
import { TokenExtension } from '@/app/validators/accounts/token-extension';

import {
    effectiveIndent,
    type ExtensionActionsPlacement,
    useExtensionActionsBottom,
    useExtensionActionsPlacement,
    useExtensionFieldsLook,
} from './token-extensions/design-variant';
import { ExtensionFields } from './token-extensions/ExtensionField';
import { TokenExtensionBadge } from './token-extensions/TokenExtensionBadge';
import { TokenExtensionRow } from './TokenAccountSection';
import { ParsedTokenExtension } from './types';

// The extension list follows the Table design of the feature-gates page (HOO-926): the same frame, header row, text
// sizes and cell paddings, with columns of its own (the extension with its status badge, the toggle). On desktop a row expands
// in place to the extension's fields; on a phone every extension is a card and a tap opens the fields in a bottom
// drawer instead. On desktop several rows can be open at once; the URL hash names the one opened last, which is how the
// status badges on the account header open a row here. On a phone a row opens a drawer, so one is open at a time.
export function TokenExtensionsSection({
    address,
    decimals,
    extensions,
    parsedExtensions,
    symbol,
}: {
    address: string;
    decimals: number;
    extensions: TokenExtension[];
    parsedExtensions: ParsedTokenExtension[];
    symbol?: string;
}) {
    const { activeExtension, navigateToExtension } = useTokenExtensionNavigation({
        uriComponent: `/address/${address}`,
    });
    // One breakpoint subscription for the list; rows read `isDesktop` as a prop, as in the Accounts card.
    const { isLandscape, isMd } = useBreakpoint();
    const isDesktop = isMd || isLandscape;

    // The rows open on desktop. A new hash (a badge on the account header, a shared link, a row opened here) adds its
    // extension to them; a phone keeps only that one, as it shows a single drawer.
    const [openExtensions, setOpenExtensions] = useState<ReadonlySet<string>>(() => new Set());
    const [seenHash, setSeenHash] = useState<string | undefined>(undefined);
    if (activeExtension !== seenHash) {
        setSeenHash(activeExtension);
        if (activeExtension) {
            setOpenExtensions(current =>
                isDesktop ? new Set(current).add(activeExtension) : new Set([activeExtension]),
            );
        }
    }

    const toggleExtension = (name: string, open: boolean) => {
        setOpenExtensions(current => {
            if (!isDesktop) return open ? new Set([name]) : new Set();
            const next = new Set(current);
            if (open) next.add(name);
            else next.delete(name);
            return next;
        });
        // The hash follows the row opened last and clears when that row closes.
        if (open) navigateToExtension(name);
        else if (activeExtension === name) navigateToExtension(undefined);
    };
    const placement = useExtensionActionsPlacement();

    return (
        <Card variant="tight" className={CARD_SURFACE}>
            {/* Below `md` every extension is a card: the name with its status badge, then the description. From `md` it
                is a CSS grid built from `div`s with ARIA table roles, as the feature-gates table is. */}
            <div role="table" className={tableVariants({ placement })}>
                <div role="row" className={rowVariants({ role: 'header' })}>
                    <div role="columnheader" className={cellVariants({ column: 'title', role: 'header' })}>
                        Extension
                    </div>
                    {placement === 'column' && (
                        <>
                            <div role="columnheader" className={cellVariants({ column: 'action', role: 'header' })}>
                                <span className="sr-only">Raw data</span>
                            </div>
                            <div role="columnheader" className={cellVariants({ column: 'action', role: 'header' })}>
                                <span className="sr-only">Documentation</span>
                            </div>
                        </>
                    )}
                    <div role="columnheader" className={cellVariants({ column: 'toggle', role: 'header' })}>
                        <span className="sr-only">Details</span>
                    </div>
                </div>
                {parsedExtensions.map(ext => {
                    const extension = extensions.find(({ extension }) => extension === ext.extension);
                    if (!extension) return null;

                    return (
                        <TokenExtensionListRow
                            key={ext.extension}
                            decimals={decimals}
                            extension={extension}
                            isDesktop={isDesktop}
                            open={openExtensions.has(ext.extension)}
                            placement={placement}
                            onOpenChange={open => toggleExtension(ext.extension, open)}
                            parsedExtension={ext}
                            symbol={symbol}
                        />
                    );
                })}
            </div>
        </Card>
    );
}

type ExtensionContentProps = {
    decimals: number;
    extension: TokenExtension;
    parsedExtension: ParsedTokenExtension;
    showRaw: boolean;
    symbol?: string;
};

/**
 * The inside of an open extension: its fields as label/value pairs, or the parsed state as JSON when
 * `showRaw` is set. Shared by the inline desktop reveal and the mobile drawer.
 */
export function TokenExtensionContent({
    decimals,
    extension,
    parsedExtension,
    showRaw,
    symbol,
}: ExtensionContentProps) {
    if (showRaw) {
        // The design-system JSON view (`v2`), as on the Metadata tab: always expanded, long values wrap inside their
        // row so nothing scrolls sideways, with a copy button for the whole block and one per row.
        return <JsonViewer version="v2" src={parsedExtension.parsed || {}} />;
    }

    return <ExtensionFields>{TokenExtensionRow(extension, undefined, decimals, symbol, 'omit')}</ExtensionFields>;
}

type RowProps = {
    decimals: number;
    extension: TokenExtension;
    isDesktop: boolean;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    parsedExtension: ParsedTokenExtension;
    placement: ExtensionActionsPlacement;
    symbol?: string;
};

function TokenExtensionListRow({
    decimals,
    extension,
    isDesktop,
    onOpenChange,
    open,
    parsedExtension,
    placement,
    symbol,
}: RowProps) {
    const [showRaw, setShowRaw] = useState(false);
    const toggleRaw = useCallback(() => setShowRaw(raw => !raw), []);
    // Like the Accounts card, the fields and the drawer mount on first open, not for every row up front.
    const [contentMounted, setContentMounted] = useState(false);
    const [drawerMounted, setDrawerMounted] = useState(false);
    if (open && isDesktop && !contentMounted) setContentMounted(true);
    if (open && !isDesktop && !drawerMounted) setDrawerMounted(true);

    const expanded = open && isDesktop;
    const { border, indent, indentActions, space } = useExtensionFieldsLook();
    const indentPx = effectiveIndent({ border, indent });
    // `space` around the fields, counting the block's own 8px. Between the fields and the buttons it is the gap, at the
    // end of the open part its bottom padding; above fields that come first the 16px of the row's bottom padding
    // stand in the way, so the open part itself moves up or down by the rest. Nothing goes past the open part's
    // edges, which clip its content for the open/close animation.
    const spaceGap = Number(space) - 8;
    const fieldsFirst = placement !== 'above';
    const fieldsLast = placement !== 'below';
    const revealShift = expanded && fieldsFirst ? Number(space) - 24 : 0;
    // Under buttons that close the open part (`below`), the space before the next record is a setting of its own.
    const actionsBottom = useExtensionActionsBottom();
    const content = (
        <TokenExtensionContent
            decimals={decimals}
            extension={extension}
            parsedExtension={parsedExtension}
            showRaw={showRaw}
            symbol={symbol}
        />
    );
    const docsLinks = (className?: string) =>
        parsedExtension.externalLinks.map(link => (
            <Button key={link.url} asChild className={className} size="sm" variant="outline">
                <ExternalLink href={link.url}>
                    <ExternalLinkIcon />
                    {link.label}
                </ExternalLink>
            </Button>
        ));
    // REVIEW(HOO-935): with `indentActions` the buttons start on the fields' line; a full frame takes no indent
    // (`effectiveIndent` is 0), so neither do they.
    const actions = (
        <div
            className={revealActionsVariants({ placement })}
            style={indentActions ? { paddingLeft: indentPx } : undefined}
        >
            <RawToggle showRaw={showRaw} onToggle={toggleRaw} size="sm" />
            {docsLinks()}
        </div>
    );

    return (
        <>
            {/* The row group is the mobile card, and from `md` the row and its reveal on the table's columns. */}
            <div
                role="rowgroup"
                id={getAnchorId(parsedExtension)}
                className={bodyVariants()}
                style={{ scrollMarginTop: 'var(--sticky-header-height, 0px)' }}
            >
                <div role="row" className={rowVariants({ role: 'body' })} onClick={() => onOpenChange(!open)}>
                    {/* The name is 16px on a 24px line with the status badge right after it, the description 14px in
                        `outer-space-300`, as the feature gates' title and description. */}
                    <div role="cell" className={cellVariants({ column: 'title' })}>
                        <ExtensionTitle ext={parsedExtension} />
                        {parsedExtension.description && (
                            <p className="m-0 mt-0.5 max-w-[640px] text-sm text-outer-space-300">
                                {parsedExtension.description}
                            </p>
                        )}
                    </div>
                    {/* REVIEW(HOO-935): the `column` placement gives Raw and Docs table columns of their own. Raw on a
                        closed row opens it straight into the JSON. Neither click toggles the row on its way up. */}
                    {placement === 'column' && (
                        <>
                            <div
                                role="cell"
                                className={cellVariants({ column: 'action' })}
                                onClick={e => e.stopPropagation()}
                            >
                                <RawToggle
                                    showRaw={showRaw && expanded}
                                    onToggle={() => {
                                        if (expanded) return toggleRaw();
                                        setShowRaw(true);
                                        onOpenChange(true);
                                    }}
                                    size="sm"
                                />
                            </div>
                            <div
                                role="cell"
                                className={cellVariants({ column: 'action' })}
                                onClick={e => e.stopPropagation()}
                            >
                                {docsLinks()}
                            </div>
                        </>
                    )}
                    <div role="cell" className={cellVariants({ column: 'toggle' })}>
                        <Button
                            aria-expanded={expanded}
                            aria-label={expanded ? 'Collapse extension details' : 'Expand extension details'}
                            className="!h-5 !w-5 [&_svg]:size-4"
                            onClick={e => {
                                e.stopPropagation();
                                onOpenChange(!open);
                            }}
                            size="icon"
                            variant="ghost"
                        >
                            <ChevronDown
                                size={16}
                                className={cn(
                                    'text-outer-space-300 transition-transform duration-200 ease-in-out',
                                    expanded ? 'rotate-180' : 'rotate-0',
                                )}
                            />
                        </Button>
                    </div>
                </div>

                {/* Desktop-only animated reveal across all columns, the same grid-rows trick as the Accounts card. It
                    shows wherever `isDesktop` holds rather than from the `md` screen: that also counts a phone on its
                    side, and `useBreakpoint` turns `md` on at 768px where the CSS screen starts at 769px, so on those
                    widths it opens inside the card. */}
                <div
                    className={cn(
                        isDesktop ? 'grid' : 'hidden',
                        'md:col-span-full',
                        'transition-[grid-template-rows,opacity,margin] duration-200 ease-in-out',
                        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                    style={{ marginTop: revealShift }}
                >
                    <div className="min-h-0 overflow-hidden">
                        {contentMounted && (
                            <div
                                className={REVEAL_STACK}
                                style={{ paddingBottom: fieldsLast ? spaceGap : actionsBottom, rowGap: spaceGap }}
                            >
                                {placement !== 'below' && actions}
                                {/* The indent is picked at runtime, hence the inline style; the line itself takes 1px of
                                    it. */}
                                <div
                                    className={fieldsBlockVariants({ border, raw: showRaw })}
                                    style={{ paddingLeft: Math.max(0, indentPx - (border === 'left' ? 1 : 0)) }}
                                >
                                    {content}
                                </div>
                                {placement === 'below' && actions}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {drawerMounted && (
                <Drawer
                    open={open && !isDesktop}
                    onOpenChange={onOpenChange}
                    aria-describedby={undefined}
                    header={
                        <Drawer.Header>
                            <DialogTitle className="mb-1.5 tracking-wide !text-outer-space-300">Extension</DialogTitle>
                            <ExtensionTitle ext={parsedExtension} placement="drawer" />
                            {parsedExtension.description && (
                                <div className="text-sm text-outer-space-300">{parsedExtension.description}</div>
                            )}
                        </Drawer.Header>
                    }
                    footer={
                        <Drawer.Footer>
                            <RawToggle showRaw={showRaw} onToggle={toggleRaw} size="tile" />
                            {parsedExtension.externalLinks.map(link => (
                                <Button key={link.url} asChild className="flex-1" size="tile" variant="outline">
                                    <ExternalLink href={link.url}>
                                        <ExternalLinkIcon />
                                        {link.label}
                                    </ExternalLink>
                                </Button>
                            ))}
                            <DialogClose asChild>
                                <Button className="flex-1" size="tile" variant="outline">
                                    <X size={16} />
                                    Close
                                </Button>
                            </DialogClose>
                        </Drawer.Footer>
                    }
                >
                    {/* The drawer body has no gutter of its own; the Accounts drawer adds `px-4` per row. */}
                    <div className="overflow-x-hidden px-4 py-2">{content}</div>
                </Drawer>
            )}
        </>
    );
}

// The feature-gates Table surface: framed from `md`; below it the cards are the surface, so the frame drops away.
// BaseCard merges classes (tailwind-merge), so these override the `tight` variant's defaults.
const CARD_SURFACE =
    'overflow-hidden rounded-lg border-0 bg-transparent md:border md:border-solid md:border-outer-space-800 md:bg-outer-space-900';

// A mobile card, or from `md` a group spanning the grid with a divider on top. The card styles are the base and `md:`
// undoes them, mobile first.
const bodyVariants = cva(
    cn(
        'rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 p-3',
        'md:col-span-full md:grid md:grid-cols-subgrid md:rounded-none md:border-0 md:border-t md:bg-transparent md:p-0',
    ),
);

// Below `md` a row's cells wrap and the title takes a whole line. From `md` the row lays its cells on the table's
// columns through `subgrid`.
const rowVariants = cva('', {
    variants: {
        role: {
            body: 'flex cursor-pointer flex-wrap items-start gap-x-4 gap-y-2 md:col-span-full md:grid md:grid-cols-subgrid md:gap-0',
            header: 'hidden md:col-span-full md:grid md:grid-cols-subgrid',
        },
    },
});

// Cell paddings apply from `md` only: below it the card owns the padding. They follow the feature-gates table, 2px
// roomier on each side so records sit 4px further apart: 16px (`py-4`) around the 24px-high 16px title; the toggle's
// 20px line starts 2px lower so it sits level with it.
const cellVariants = cva('min-w-0', {
    compoundVariants: [
        { class: 'flex-col md:py-4', column: 'title', role: 'body' },
        { class: 'md:pb-4 md:pt-[18px]', column: 'toggle', role: 'body' },
        // A 28px button centred on the title's first line: 16px down to the 24px line, 2px above its middle.
        { class: 'md:pb-4 md:pt-3.5', column: 'action', role: 'body' },
    ],
    defaultVariants: { role: 'body' },
    variants: {
        column: {
            action: 'hidden flex-col gap-2 md:flex md:px-3',
            title: 'flex w-full [overflow-wrap:anywhere] md:w-auto md:px-3',
            // A phone opens the drawer from anywhere on the card, so the chevron is desktop-only.
            toggle: 'hidden justify-end md:flex md:px-3',
        },
        role: {
            body: '',
            header: 'items-center whitespace-nowrap py-2.5 text-xs uppercase text-outer-space-300',
        },
    },
});

// REVIEW(HOO-935): where Raw and Docs sit (`useExtensionActionsPlacement`). `above` / `below`: in a line over or
// under the open fields. `column`: in two table columns of their own between the title and the toggle, sized to their
// buttons (`auto` on the shared grid, so every row's buttons line up). A phone on its side (and a 768px window, see the
// reveal) opens rows inline but lays them out as cards with no button columns, so there the buttons stay over the
// fields (`md:hidden`).
// Below `md` the cards stand 8px apart, as the block page's transaction cards (`DataListRow`'s `mb-2`).
const tableVariants = cva('flex w-full flex-col gap-2 text-sm text-white md:grid md:gap-0', {
    variants: {
        placement: {
            above: 'md:grid-cols-[minmax(0,1fr)_3rem]',
            below: 'md:grid-cols-[minmax(0,1fr)_3rem]',
            column: 'md:grid-cols-[minmax(0,1fr)_auto_auto_3rem]',
        },
    },
});

const revealActionsVariants = cva('flex flex-wrap gap-2', {
    variants: { placement: { above: '', below: '', column: 'md:hidden' } },
});

// The fields get 8px of air above and below, which the left border's line runs through. REVIEW(HOO-935): three of
// the design-menu settings act here. `space` sets the spacing around the block (`spaceGap`, `revealShift`).
// `border: 'left'` draws a 1px line down the fields' left side on the open part's 12px line, where the row's name and
// description start, square at both ends. The indent (`effectiveIndent`) sets how far after that line the fields
// start. The rounded frame of `border: 'all'` is drawn by `ExtensionFields`.
// `raw` keeps the JSON's corner copy button on the row chevron's vertical. The chevron's centre sits 22px in from the
// row's right edge (12px cell padding plus half of its 20px button), the 13px copy glyph's 18.5px in (the open part's
// 12px plus half of 13px). That is 3.5px, rounded to the scale's 4px.
const fieldsBlockVariants = cva('py-2', {
    variants: {
        border: { all: '', left: 'border-0 border-l border-solid border-outer-space-800', none: '' },
        raw: { false: '', true: 'pr-1' },
    },
});

// The open part, buttons included, starts on the row's own 12px line. The gap and the bottom padding are set inline:
// from `space` (`spaceGap`), or under buttons that close it (`below`) from the design menu's `actionsBottom`.
const REVEAL_STACK = 'flex flex-col px-3';

// Raw swaps the fields for the parsed JSON. The label names what a press shows next, so the pressed
// state reads "Fields" and the button keeps `aria-pressed` for assistive tech.
// `tile` buttons share the drawer footer equally, like the Accounts drawer's footer actions.
const rawToggleVariants = cva('', {
    variants: { size: { sm: '', tile: 'flex-1' } },
});

function RawToggle({
    className,
    onToggle,
    showRaw,
    size,
}: {
    className?: string;
    onToggle: () => void;
    showRaw: boolean;
    size: 'sm' | 'tile';
}) {
    return (
        <Button
            aria-label={showRaw ? 'Hide raw data' : 'Show raw data'}
            aria-pressed={showRaw}
            className={cn(rawToggleVariants({ size }), className)}
            onClick={onToggle}
            size={size}
            variant="outline"
        >
            {/* The Button size sets the icon size. */}
            {showRaw ? <List /> : <Code />}
            {showRaw ? 'Fields' : 'Raw'}
        </Button>
    );
}

// `row` is the list row heading, one step above the row's `text-sm` content. `drawer` is the drawer
// heading, sized like the address in the Accounts drawer.
const extensionNameVariants = cva('text-white', {
    defaultVariants: { placement: 'row' },
    variants: { placement: { drawer: 'text-xl leading-snug', row: 'text-base leading-6' } },
});

// The name and its status badge, which follows it on the same line and wraps under it when the name runs long.
function ExtensionTitle({ ext, placement }: { ext: ParsedTokenExtension; placement?: 'row' | 'drawer' }) {
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={extensionNameVariants({ placement })}>{ext.name}</span>
            {/* The badge has its own tooltip; clicks on it still toggle the row. */}
            <TokenExtensionBadge extension={ext} />
        </div>
    );
}
