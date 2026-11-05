'use client';

import { Address } from '@components/common/Address';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/shared/ui/tooltip';
import solanaLogo from '@img/logos-solana/low-contrast-solana-logo.svg';
import { PublicKey } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { Fragment, type ReactNode, useState, useSyncExternalStore } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'react-feather';

import type { NftCollection, NftHeaderModel } from '@/app/components/account/nft-header/model';
import { OriginalImageDialog } from '@/app/components/account/nft-header/OriginalImageDialog';
import type { NftHeaderVariant } from '@/app/components/account/nft-header-variant';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { cn } from '@/app/components/shared/utils';
import { ProxiedImage } from '@/app/features/metadata';
import { getSafeExternalHref } from '@/app/shared/lib/url';
import { LABEL_WIDTH } from '@/app/shared/ui/key-value';
import { pageTitleVariants } from '@/app/shared/ui/page-layout';

// REVIEW(HOO-921): the NFT header layouts under review. Each takes the same
// `NftHeaderModel`, so the regular and the compressed page switch together. Remove the losers before the external PR.

/** Renders one of the layouts under review. */
export function NftHeaderLayout({ variant, model }: { variant: NftHeaderVariant; model: NftHeaderModel }) {
    switch (variant) {
        case 'card':
        case 'split':
            return <CardNftHeader model={model} layout={variant} />;
        case 'wideArt':
            return <WideArtNftHeader model={model} />;
    }
}

/**
 * The art full width below `sm` and up to half the row from it, the name, then a label / value list. Market and
 * Metadata are left to the Overview card.
 *
 * From `sm` (576px) a grid: the art in the first row of the left column, its "View original" link in the second, the text
 * in the first row of the right column. The text cell then gets exactly the art's height, and the name and the list,
 * held together as one block, sit at its vertical centre; the link stays below both.
 * The left track (`fit-content`) hugs the art, up to 320px or half the row (`0.75rem` is half the `gap-x-6`).
 */
function WideArtNftHeader({ model }: { model: NftHeaderModel }) {
    return (
        // `max-sm:-mt-5`: above the art the page stacks 36px (the layout's `pt-3` and the address header's `py-6`); while
        // the art sits above the text it should be 16px from the top, the same as from the page's side edge.
        <div className="grid w-full gap-y-2 max-sm:-mt-5 sm:grid-cols-[fit-content(min(320px,calc(50%-0.75rem)))_minmax(0,1fr)] sm:gap-x-6">
            {/* Below `sm` "View original" hangs under the art's right edge, in the gap above the text; from `sm` it is
                a line of its own under the art. */}
            <NftArt
                uri={model.image}
                under={
                    <span className="sm:hidden">
                        <OriginalLink uri={model.image} />
                    </span>
                }
            />
            <div className="hidden sm:col-start-1 sm:row-start-2 sm:block">
                <OriginalLink uri={model.image} />
            </div>
            {/* `max-sm:mt-4`: below `sm` the type label sits 24px below the art (`gap-y-2` plus this). */}
            <div className="flex min-w-0 flex-col justify-center gap-3 max-sm:mt-4 sm:col-start-2 sm:row-start-1">
                <Heading model={model} />
                {/* `items-baseline`: a value with a badge (Collection) is taller than its label; aligning on the text's
                    baseline keeps the label level with the value instead of pinned to the row's top. `gap-y-2` is the
                    8px between lines of the mobile transaction cards; `mt-2` makes it 20px under the name. */}
                <dl className="m-0 mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-sm">
                    <Spec label="Symbol">{model.symbol ?? <Muted />}</Spec>
                    {/* Compressed NFTs have no edition accounts, so the row would always be empty. */}
                    {!model.compressed && <Spec label="Edition">{model.edition ?? <Muted />}</Spec>}
                    <Spec label="Collection">
                        {model.collection ? <CollectionLink collection={model.collection} /> : <Muted />}
                    </Spec>
                    {model.compressed && (
                        <Spec label="Storage">
                            <Hint text={COMPRESSED_TOOLTIP}>Compressed</Hint>
                        </Spec>
                    )}
                    <Spec label="Creators">
                        <NftCreatorsList creators={model.creators} />
                    </Spec>
                </dl>
            </div>
        </div>
    );
}

/**
 * HOO-929's card headers, on the Metaplex model: the art, the type label with "View original", the name and the Wide
 * Art header's rows. The Overview card stays as it is, under them.
 */
function CardNftHeader({ model, layout }: { model: NftHeaderModel; layout: FactLayout }) {
    const Layout = layout === 'card' ? CardLayout : SplitLayout;
    return (
        <Layout
            art={<NftArt uri={model.image} onCard />}
            originalLink={<OriginalLink uri={model.image} look={ORIGINAL_LINK_LOOKS[layout]} />}
            label={model.typeLabel}
            name={<h2 className={CARD_NAME_CLASSES}>{model.name}</h2>}
            specs={<FactStrip facts={modelFacts(model)} layout={layout} />}
        />
    );
}

/** One label / value block of the card headers. */
type NftFact = { label: string; value: ReactNode };

/** The Wide Art header's rows: Market and Metadata are left to the Overview card. */
function modelFacts(model: NftHeaderModel): NftFact[] {
    const facts: (NftFact | false)[] = [
        { label: 'Symbol', value: model.symbol ?? <Muted /> },
        // Compressed NFTs have no edition accounts, so the row would always be empty.
        !model.compressed && { label: 'Edition', value: model.edition ?? <Muted /> },
        {
            label: 'Collection',
            value: model.collection ? <CollectionLink collection={model.collection} /> : <Muted />,
        },
        model.compressed && { label: 'Storage', value: <Hint text={COMPRESSED_TOOLTIP}>Compressed</Hint> },
        { label: 'Creators', value: <NftCreatorsList creators={model.creators} /> },
    ];
    return facts.filter((fact): fact is NftFact => fact !== false);
}

type CardLayoutProps = {
    art: ReactNode;
    originalLink: ReactNode;
    label: string;
    name: ReactNode;
    specs: ReactNode;
};

/**
 * The whole header on a card, the NFT cards' surface. Beside the art the type label sits above the name, with "View
 * original" at the end of its row; the facts close the card. From `sm` the art takes the left column, the text the
 * top of the right one and the facts its bottom; below `sm` everything stacks under the art, and the facts are a list
 * across the card's full width.
 */
function CardLayout({ art, originalLink, label, name, specs }: CardLayoutProps) {
    return (
        // `max-sm:-mt-5` as in the wide layout. `p-2.5`: the art sits 10px from the card's edges; the text gets more
        // (`TEXT_INSET`) so it isn't pressed to the border.
        <div className="grid w-full gap-y-3 rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 p-2.5 max-sm:-mt-5 sm:grid-cols-[fit-content(min(320px,calc(50%-0.75rem)))_minmax(0,1fr)] sm:grid-rows-[1fr_auto] sm:gap-x-6">
            {/* `min-w-0`: lets the track hold its cap while the loading square asks for more, as the art's own frame
                does. */}
            <div className="min-w-0 sm:col-start-1 sm:row-span-2 sm:row-start-1">{art}</div>
            <div className={cn(CARD_TEXT_CLASSES, TEXT_INSET)}>
                {/* The label and the name are spaced like every other page's header (`PageHeader`). */}
                <div className="flex flex-col gap-1.5">
                    {/* The negative right margin takes back part of the text's inset (`TEXT_INSET`), so "View original"
                        sits 14px from the card's right edge. `items-baseline`: the label and the button's text share a
                        line. */}
                    <div className="flex items-center justify-between gap-3 max-sm:-mr-0.5 sm:-mr-2.5">
                        {/* The key-value rows' key gray, like "View original" beside it. */}
                        <span className="text-xs font-normal uppercase text-outer-space-300">{label}</span>
                        {originalLink}
                    </div>
                    {name}
                </div>
            </div>
            <div className={CARD_FACTS_CLASSES}>{specs}</div>
        </div>
    );
}

/**
 * The card layout cut in two: the art on a card of its own and the name with the facts on another, side by side in
 * the same columns (the left one hugs the art, up to 320px or half the row). Below `sm` the two cards stack. The name
 * opens the text card, and the facts close it: a list across the card's full width below `sm`, plain label / value
 * pairs from it.
 */
function SplitLayout({ art, originalLink, label, name, specs }: CardLayoutProps) {
    return (
        // `max-sm:-mt-5` as in the wide layout. `346px`: the 320px art plus its card's padding and border.
        <section className="flex w-full flex-col gap-3 max-sm:-mt-5">
            <TitleRow label={label} originalLink={originalLink} />
            {/* The gap between the cards is the NFToken grid's: 6px below `sm`, 12px from it. */}
            <div className="grid w-full gap-1.5 sm:grid-cols-[fit-content(min(346px,calc(50%-0.375rem)))_minmax(0,1fr)] sm:gap-3">
                {/* `self-start`: the card is as tall as the art, however tall the text card beside it grows. */}
                <div className={cn(CARD_SURFACE, SPLIT_PADDING, 'min-w-0 self-start')}>{art}</div>
                {/* `justify-between`: the text card is at least as tall as the art card, and its facts keep to the
                    bottom. */}
                <div className={cn(CARD_SURFACE, SPLIT_PADDING, 'flex min-w-0 flex-col justify-between gap-6')}>
                    {/* `[container-type:inline-size]`: the name's size follows this card's width (see
                        `CARD_NAME_CLASSES`). */}
                    <div className="flex min-w-0 flex-col gap-3 [container-type:inline-size]">{name}</div>
                    {/* Below `sm` the list reaches the card's edges with a line along its top, as on the single card. */}
                    <div className="min-w-0 overflow-hidden max-sm:-mx-2.5 max-sm:-mb-2.5 max-sm:border-0 max-sm:border-t max-sm:border-solid max-sm:border-outer-space-800">
                        {specs}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Both split cards keep their content the same distance from their edges: 10px below `sm`, 12px from it, which
// follows the gap between them.
const SPLIT_PADDING = 'p-2.5 sm:p-3';

/** The split layout's title row, spaced like the Overview card's (`OverviewCard`). */
function TitleRow({ label, originalLink }: Pick<CardLayoutProps, 'label' | 'originalLink'>) {
    return (
        <div className="flex min-h-[1.75rem] flex-wrap items-center justify-between gap-2">
            <div className="text-lg font-normal text-white">{label}</div>
            {originalLink}
        </div>
    );
}

// The NFToken NFT cards' surface.
const CARD_SURFACE = 'rounded-lg border border-solid border-outer-space-800 bg-outer-space-900';

// The split layout's "View original" sits in the title row like the Overview's outlined buttons; the card layout's,
// alone beside the type label, drops the outline.
const ORIGINAL_LINK_LOOKS = { card: 'ghost', split: 'button' } as const;

// Beside the art at its top, the label row 16px from the card's edge (`sm:pt-1.5` on the card's 10px).
// `[container-type:inline-size]`: the name's size follows this column's width (see `CARD_NAME_CLASSES`).
const CARD_TEXT_CLASSES =
    'flex min-w-0 flex-col gap-3 [container-type:inline-size] sm:col-start-2 sm:row-start-1 sm:pt-1.5';

// Below `sm` the facts reach the card's border: the negative margins undo its padding, and a line runs along their
// top. `overflow-hidden` clips the lines the rows draw along the card's border (see `FACT_STRIP_CLASSES`). From `sm`
// no lines: the pairs keep to the bottom of the right column, as the `1fr` row above them takes the art's spare
// height, 24px from the card's bottom edge.
const CARD_FACTS_CLASSES = [
    'min-w-0 -mx-2.5 -mb-2.5 overflow-hidden border-0 border-t border-solid border-outer-space-800',
    'sm:col-start-2 sm:row-start-2 sm:m-0 sm:border-t-0 sm:pb-3.5 sm:pr-3.5',
].join(' ');

// The text's side inset on the card: 16px from its edges below `sm`, 24px from its right edge from `sm`.
const TEXT_INSET = 'max-sm:px-1.5 sm:pr-3.5';

// Sized by the text column, not the window (`cqi`, a hundredth of the column's width; the column is a size container),
// so the name stops growing once the page reaches its fixed width. 30px at the least, so a long word still fits a
// phone's card, 54px at the most. `leading-tight`, because a long name wraps at these sizes.
const CARD_NAME_CLASSES = 'm-0 break-words text-[length:clamp(30px,9cqi,54px)] font-normal leading-tight text-white';

type FactLayout = 'card' | 'split';

/**
 * The card headers' facts. Below `sm` one column of Overview-like rows, label beside value, ruled on every side; from
 * `sm` plain label / value pairs with no lines.
 */
function FactStrip({ facts, layout }: { facts: NftFact[]; layout: FactLayout }) {
    return (
        <dl className={FACT_STRIP_CLASSES}>
            {facts.map(({ label, value }) => (
                <div key={label} className={factVariants({ layout })}>
                    <dt className={cn('flex-none text-sm font-normal text-outer-space-300', LABEL_WIDTH)}>{label}</dt>
                    {/* `overflow-hidden`: an address measures its full text in a hidden span, which would otherwise
                        widen the page on a phone. */}
                    <dd className="m-0 min-w-0 flex-1 overflow-hidden text-sm text-white">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

// Below `sm` every row draws its right and bottom lines; the list is 1px wider and taller than its clipping box, so
// the lines along the card's border, which would double it, are cut off.
const FACT_STRIP_CLASSES = 'm-0 -mb-px -mr-px grid grid-cols-1 sm:m-0 sm:gap-y-2';

// Below `sm` the Overview row: label and value side by side, the text as far from the card's edges as the card's
// other text. From `sm` a bare pair, spaced like the wide header's rows.
const factVariants = cva(
    'flex min-w-0 flex-row items-baseline gap-dk-4 border-0 border-b border-r border-solid border-outer-space-800 py-2.5 sm:gap-4 sm:border-0 sm:p-0',
    {
        variants: {
            // `card`: 16px, the card's 10px plus the text's 6px (`TEXT_INSET`); `split`: the card's own padding
            // (`SPLIT_PADDING`).
            layout: { card: 'px-4', split: 'px-2.5' },
        },
    },
);

// The art gets a slot and sizes itself inside it: it scales down to fit, keeps its proportions and sits at the slot's
// left, so the rounded corners always land on the art itself (`object-contain` in a wider box would round the box and
// leave the art's corners square). The slot hugs the art (`w-fit`): the browser carries the 480px height cap through
// the art's proportions, so a tall image gets a narrower slot and the text moves up to it. Below `sm` the slot may take
// the whole column (a tall image stops at 480px high and stays at the left); from `sm` (576px) the header's grid track
// caps it at 320px or half the row. `min-w-0` lets the track hold that cap while the loading square, which unlike the
// image can't shrink, asks for its full width.
const ART_FRAME_CLASSES = 'relative flex w-fit min-w-0 max-w-full flex-col items-start self-start';

// On a card the art gets the NFToken NFT cards' pair: 4px corners in an 8px card.
const ART_RADIUS = { false: 'rounded-lg', true: 'rounded' } as const;

const nftArtVariants = cva('block h-auto max-h-[480px] w-auto max-w-full', {
    defaultVariants: { onCard: false },
    variants: { onCard: ART_RADIUS },
});

// While the art loads, a square holds the space the art will most likely take. It has a width of its own, because the
// art's slot takes its width from what it holds.
const nftArtPlaceholderVariants = cva('aspect-square w-[min(480px,calc(100vw-2rem))] max-w-full', {
    defaultVariants: { onCard: false },
    variants: { onCard: ART_RADIUS },
});

const ART_PIXELS = 320;
// The height cap: the art is shown whole but can't stretch the page on either side, however odd its proportions. The
// width cap is the slot's.
const MAX_HEIGHT = 480;
// Art this small is almost always pixel art, drawn to be enlarged with hard edges.
const PIXEL_ART_MAX_SIDE = 256;

function NftArt({
    uri,
    under,
    onCard = false,
}: {
    uri?: string;
    /** Set on a card, so smaller corners than the card's own. */
    onCard?: boolean;
    /** Hung under the art's right edge, out of the layout, so the rows below keep their spacing. */
    under?: ReactNode;
}) {
    // The art's own size, known once it loads; tied to its uri so a new image starts from scratch.
    const [natural, setNatural] = useState<{ uri?: string; width: number; height: number }>();
    const loaded = natural?.uri === uri ? natural : undefined;

    return (
        <div className={ART_FRAME_CLASSES}>
            <ProxiedImage
                alt="nft"
                className={nftArtVariants({ onCard })}
                height={ART_PIXELS}
                onLoad={event =>
                    setNatural({
                        height: event.currentTarget.naturalHeight,
                        uri,
                        width: event.currentTarget.naturalWidth,
                    })
                }
                placeholder={<Skeleton className={nftArtPlaceholderVariants({ onCard })} />}
                fallback={failure => <NftArtFallback onCard={onCard} reason={failure?.reason} />}
                style={loaded ? artStyle(loaded) : undefined}
                uri={uri}
                width={ART_PIXELS}
            />
            {under && <div className="absolute right-0 top-full">{under}</div>}
        </div>
    );
}

// Art that failed to load gets the Solana logo tile in the loading square's place, so the header keeps the size and
// corners it had while loading. `ProxiedImage`'s own fallback stays at the logo's 60px: the art's classes size it by
// what it holds. The logo's tile has its own rounded corners, 8px at 60px, which would grow with the tile; the box
// paints the tile's colour behind it, so the corners the eye sees are the box's.
function NftArtFallback({ onCard, reason }: { onCard: boolean; reason?: string }) {
    return (
        <div
            className={cn(nftArtPlaceholderVariants({ onCard }), 'overflow-hidden bg-[#212b2a]')}
            data-testid="nft-art-fallback"
        >
            {/* Not decorative on failure: it stands in for the art and carries the reason, as in `ProxiedImage`. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={reason ?? ''} className="block size-full" src={solanaLogo.src} title={reason} />
        </div>
    );
}

// The width that makes the art exactly as tall as the cap, so small art scales up as well as large art scales down;
// `max-w-full` then narrows it to the slot, keeping its proportions. Small art also keeps hard pixel edges instead of
// the browser's blur.
function artStyle({ width, height }: { width: number; height: number }) {
    if (width === 0 || height === 0) return undefined;
    return {
        imageRendering: Math.max(width, height) <= PIXEL_ART_MAX_SIDE ? ('pixelated' as const) : undefined,
        width: Math.round((MAX_HEIGHT * width) / height),
    };
}

/**
 * A quiet link to the image at its source, for when the proxied copy fails or someone wants the full file. A click
 * always asks first (`OriginalImageDialog`). With a mouse, the external-site hint also
 * opens on hovering it, like the badges; a touch screen has no hover, so there the dialog alone explains.
 */
function OriginalLink({
    uri,
    look = 'link',
}: {
    uri?: string;
    /**
     * `button` looks like the Overview card's Raw button, for the split header's title row; `ghost` is a button of
     * that size with no outline, in the type label's gray, for the card header's label row.
     */
    look?: 'link' | 'button' | 'ghost';
}) {
    const canHover = useCanHover();
    // The dialog would open any href; only an http(s) image gets the link at all.
    if (!uri || !getSafeExternalHref(uri)) return undefined;

    const trigger =
        look === 'button' ? (
            <Button variant="outline" size="sm">
                View original
                <ExternalLinkIcon size={12} />
            </Button>
        ) : (
            <button type="button" className={originalLinkVariants({ look })}>
                View original
                {/* 1px up: centred on the box, the icon sits low against the text's x-height. */}
                <ExternalLinkIcon size={12} className="-translate-y-px" />
            </button>
        );

    if (!canHover) {
        return <OriginalImageDialog uri={uri}>{trigger}</OriginalImageDialog>;
    }

    // The dialog's trigger props pass through the tooltip trigger onto the button, so one button opens both.
    return (
        <Tooltip>
            <OriginalImageDialog uri={uri}>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            </OriginalImageDialog>
            <TooltipContent>{EXTERNAL_RESOURCE_HINT}</TooltipContent>
        </Tooltip>
    );
}

// In the type label's gray so the header's two captions read as one: `link` in the plain header's `text-muted`, a
// quiet caption under the art; `ghost` in the card header's key gray (`text-outer-space-300`, the key-value rows'
// keys). `ghost` is the `Button` `sm` box (height, padding, rounding; the icon 4px closer) with a hover fill instead
// of an outline; its own classes, since `Button`'s ghost is white and recolouring it from here would mean overriding
// the base component.
const originalLinkVariants = cva(
    'inline-flex w-fit items-center whitespace-nowrap border-0 bg-transparent text-xs hover:text-white',
    {
        variants: {
            look: {
                ghost: 'h-7 gap-1 rounded px-2 text-outer-space-300 hover:bg-neutral-800',
                link: 'gap-1 p-0 text-muted',
            },
        },
    },
);

const HOVER_QUERY = '(hover: hover)';

// Whether the main pointer can hover. Asked of the device, not the window width: a mouse on a narrow window still
// hovers, a touch tablet doesn't. The server render assumes a mouse.
function useCanHover() {
    const prismPointer = usePrismPointer();
    const deviceCanHover = useSyncExternalStore(
        onChange => {
            const query = window.matchMedia(HOVER_QUERY);
            query.addEventListener('change', onChange);
            return () => query.removeEventListener('change', onChange);
        },
        () => window.matchMedia(HOVER_QUERY).matches,
        () => true,
    );
    return prismPointer === undefined ? deviceCanHover : prismPointer === 'mouse';
}

// REVIEW(HOO-921): the local review prism (`public/_prism.html`, git-excluded) can't make the browser report another
// device, so it hands its Pointer choice to the frame: `window.__prismPointer` plus a 'prism:pointer' event. Outside
// the prism nothing sets it and the device decides.
function usePrismPointer(): 'mouse' | 'touch' | undefined {
    return useSyncExternalStore(
        onChange => {
            window.addEventListener('prism:pointer', onChange);
            return () => window.removeEventListener('prism:pointer', onChange);
        },
        () => (window as Window & { __prismPointer?: 'mouse' | 'touch' }).__prismPointer,
        () => undefined,
    );
}

// The type label and the name, spaced and sized like every other page's header (`PageHeader`): 6px between them,
// the title at `leading-none`. `break-words` lets a long NFT name wrap instead of widening the page.
function Heading({ model }: { model: NftHeaderModel }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-normal uppercase text-muted">{model.typeLabel}</span>
            <h2 className={cn(pageTitleVariants(), 'break-words')}>{model.name}</h2>
        </div>
    );
}

function Pill({
    tooltip,
    variant = 'gray',
    children,
}: {
    tooltip?: string;
    variant?: 'gray' | 'success';
    children: ReactNode;
}) {
    const badge = (
        <Badge variant={variant} size="sm" className={tooltip ? 'cursor-help' : undefined}>
            {children}
        </Badge>
    );
    if (!tooltip) return badge;
    // The explanation opens on the badge itself, not on a separate help icon.
    return (
        <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent className="max-w-64">{tooltip}</TooltipContent>
        </Tooltip>
    );
}

/**
 * The collection's name (its address until the name loads), linked to the collection's page, and a Verified badge.
 * Only a verified collection reaches the model, so the badge always shows.
 */
function CollectionLink({ collection }: { collection: NftCollection }) {
    const path = useClusterPath({ pathname: `/address/${collection.address}` });
    return (
        // `items-baseline`: the Verified tag's text sits on the name's baseline.
        <span className="flex min-w-0 items-baseline gap-2">
            {/* A plain link, not `Address`: that one prefers the viewer's nickname for the address, while a header
                names the collection the way its creators did. Copy and nickname tools stay with the Overview row. */}
            <Link href={path} className={collectionLinkVariants({ named: collection.name !== undefined })}>
                {collection.name ?? shortAddress(collection.address)}
            </Link>
            {/* The negative margin cancels the badge's own vertical padding, so the tag takes one text line of
                height and doesn't make its row taller than the others. */}
            <span className="-my-0.5 inline-flex shrink-0">
                <Pill tooltip={VERIFIED_COLLECTION_TOOLTIP} variant="success">
                    Verified
                </Pill>
            </span>
        </span>
    );
}

// The name reads as text; the address that stands in while the name loads stays monospace like elsewhere.
const collectionLinkVariants = cva('min-w-0 truncate', {
    variants: { named: { false: 'font-mono', true: '' } },
});

function shortAddress(address: string) {
    return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** "Mutable" or "Immutable" with what it means for the NFT on hover; the Overview card's Metadata row uses it too. */
export function MutabilityHint({ mutable }: { mutable: boolean }) {
    return <Hint text={mutabilityTooltip(mutable)}>{mutable ? 'Mutable' : 'Immutable'}</Hint>;
}

/** Text with an explanation on hover, for the label / value list. */
function Hint({ text, children }: { text: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-outer-space-500 decoration-dotted underline-offset-4">
                    {children}
                </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{text}</TooltipContent>
        </Tooltip>
    );
}

/**
 * Each creator's address and royalty share, listed instead of hidden in a menu. The shares form their own column,
 * left-aligned right after the longest address.
 */
function NftCreatorsList({ creators }: { creators: NftHeaderModel['creators'] }) {
    if (!creators || creators.length === 0) return <Muted />;
    return (
        <div className="grid min-w-0 grid-cols-[minmax(0,max-content)_1fr] items-baseline gap-x-3 gap-y-1 overflow-hidden">
            {creators.map(creator => (
                <Fragment key={creator.address}>
                    <div className="min-w-0">
                        <Address pubkey={new PublicKey(creator.address)} link />
                    </div>
                    <span className="text-left text-outer-space-300">
                        {creator.share}%{creator.verified ? '' : ' · unverified'}
                    </span>
                </Fragment>
            ))}
        </div>
    );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
    return (
        <>
            <dt className="font-normal text-outer-space-300">{label}</dt>
            <dd className="m-0 min-w-0 text-white">{children}</dd>
        </>
    );
}

function Muted() {
    return <span className="text-outer-space-300">—</span>;
}

// Says why the link deserves care: the image URL comes from metadata anyone can write.
const EXTERNAL_RESOURCE_HINT = 'External resource. Sees your IP address and may not be an image.';

const MUTABLE_TOOLTIP = "The update authority can still change this NFT's name, image and creators.";
const IMMUTABLE_TOOLTIP = "No one can change this NFT's name, image or creators.";

// The original header's tooltip copy, kept word for word.
const VERIFIED_COLLECTION_TOOLTIP =
    'This NFT has been verified as a member of an on-chain collection. This tag guarantees authenticity.';
const COMPRESSED_TOOLTIP =
    'This NFT does not have a corresponding account, but uses verified ledger data to allow for transfers and trades. The existence of this tag ensures that the compressed NFT is verifiably up-to-date with the chain.';
// Mutability is about trust, not a technical detail: a mutable NFT can still get a new name or image.
function mutabilityTooltip(mutable: boolean) {
    return mutable ? MUTABLE_TOOLTIP : IMMUTABLE_TOOLTIP;
}
