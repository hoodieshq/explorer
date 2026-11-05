'use client';

import { Address } from '@components/common/Address';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/shared/ui/tooltip';
import solanaLogo from '@img/logos-solana/low-contrast-solana-logo.svg';
import { PublicKey } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { type CSSProperties, Fragment, type ReactNode, useState } from 'react';
import { ExternalLink as ExternalLinkIcon, HelpCircle } from 'react-feather';

import {
    type NftCreatorsUnverified,
    useNftCreatorsPlacement,
    useNftCreatorsShare,
    useNftCreatorsUnverified,
} from '@/app/components/account/nft-creators-variant';
import type { NftCollection, NftCreator, NftHeaderModel } from '@/app/components/account/nft-header/model';
import { OriginalImageDialog } from '@/app/components/account/nft-header/OriginalImageDialog';
import {
    type NftCardSpacing,
    useNftCardSpacing,
    useNftOriginalLinkPlacement,
} from '@/app/components/account/nft-header-options';
import type { NftHeaderVariant } from '@/app/components/account/nft-header-variant';
import { Badge } from '@/app/components/shared/ui/badge';
import { ExternalLinkMark } from '@/app/components/shared/ui/external-link';
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
    // REVIEW(HOO-921): the design menu may move the creators to the Overview card.
    const creatorsInHeader = useNftCreatorsPlacement() === 'header';
    const originalInRow = useNftOriginalLinkPlacement() === 'row';
    return (
        // `max-sm:-mt-5`: above the art the page stacks 36px (the layout's `pt-3` and the address header's `py-6`); while
        // the art sits above the text it should be 16px from the top, the same as from the page's side edge.
        <div className="grid w-full gap-y-2 max-sm:-mt-5 sm:grid-cols-[fit-content(min(320px,calc(50%-0.75rem)))_minmax(0,1fr)] sm:gap-x-6">
            {/* Below `sm` "View original" hangs under the art's right edge, in the gap above the text; from `sm` it is
                a line of its own under the art. */}
            <NftArt
                uri={model.image}
                under={
                    !originalInRow && (
                        <span className="sm:hidden">
                            <OriginalLink uri={model.image} />
                        </span>
                    )
                }
            />
            {!originalInRow && (
                <div className="hidden sm:col-start-1 sm:row-start-2 sm:block">
                    <OriginalLink uri={model.image} />
                </div>
            )}
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
                    {creatorsInHeader && (
                        <Spec label="Creators">
                            <NftCreatorsList creators={model.creators} />
                        </Spec>
                    )}
                    {originalInRow && hasOriginal(model.image) && (
                        <Spec label="Original">
                            <OriginalLink uri={model.image} look="row" />
                        </Spec>
                    )}
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
    // REVIEW(HOO-921): the design menu may move the creators to the Overview card.
    const creatorsInHeader = useNftCreatorsPlacement() === 'header';
    const originalInRow = useNftOriginalLinkPlacement() === 'row';
    const spacing = useNftCardSpacing();
    const Layout = layout === 'card' ? CardLayout : SplitLayout;
    return (
        <Layout
            art={<NftArt uri={model.image} onCard />}
            originalLink={!originalInRow && <OriginalLink uri={model.image} look="ghost" />}
            label={model.typeLabel}
            name={<h2 className={CARD_NAME_CLASSES}>{model.name}</h2>}
            spacing={spacing}
            specs={
                <FactStrip
                    facts={modelFacts(model, { creators: creatorsInHeader, original: originalInRow })}
                    layout={layout}
                />
            }
        />
    );
}

/** One label / value block of the card headers. */
type NftFact = { label: string; value: ReactNode };

/** The Wide Art header's rows: Market and Metadata are left to the Overview card, and the creators may be. */
function modelFacts(
    model: NftHeaderModel,
    { creators, original }: { creators: boolean; original: boolean },
): NftFact[] {
    const facts: (NftFact | false)[] = [
        { label: 'Symbol', value: model.symbol ?? <Muted /> },
        // Compressed NFTs have no edition accounts, so the row would always be empty.
        !model.compressed && { label: 'Edition', value: model.edition ?? <Muted /> },
        {
            label: 'Collection',
            value: model.collection ? <CollectionLink collection={model.collection} /> : <Muted />,
        },
        model.compressed && { label: 'Storage', value: <Hint text={COMPRESSED_TOOLTIP}>Compressed</Hint> },
        creators && { label: 'Creators', value: <NftCreatorsList creators={model.creators} /> },
        original &&
            hasOriginal(model.image) && { label: 'Original', value: <OriginalLink uri={model.image} look="row" /> },
    ];
    return facts.filter((fact): fact is NftFact => fact !== false);
}

type CardLayoutProps = {
    art: ReactNode;
    originalLink: ReactNode;
    label: string;
    name: ReactNode;
    specs: ReactNode;
    /** REVIEW(HOO-921): how the card layout spaces its text; the split layout has its own. */
    spacing?: NftCardSpacing;
};

/**
 * The whole header on a card, the NFT cards' surface. Beside the art the type label sits above the name, with "View
 * original" at the end of its row; the facts close the card. From `sm` the art takes the left column, the text the
 * top of the right one and the facts its bottom; below `sm` everything stacks under the art, and the facts are a list
 * across the card's full width.
 */
function CardLayout({ art, originalLink, label, name, specs, spacing = 'stretch' }: CardLayoutProps) {
    const text = (
        <>
            <div className={cn(CARD_TEXT_CLASSES, TEXT_INSET)}>
                {/* The negative right margin takes back part of the text's inset (`TEXT_INSET`), so "View original"
                    sits 14px from the card's right edge. */}
                <CardHeading
                    label={label}
                    originalLink={originalLink}
                    name={name}
                    rowClassName="max-sm:-mr-0.5 sm:-mr-2.5"
                />
            </div>
            <div className={CARD_FACTS_CLASSES}>{specs}</div>
        </>
    );
    return (
        // `max-sm:-mt-5` as in the wide layout. `p-2.5`: the art sits 10px from the card's edges; the text gets more
        // (`TEXT_INSET`) so it isn't pressed to the border.
        <div className="grid w-full gap-y-3 rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 p-2.5 max-sm:-mt-5 sm:grid-cols-[fit-content(min(320px,calc(50%-0.75rem)))_minmax(0,1fr)] sm:grid-rows-[1fr_auto] sm:gap-x-6">
            {/* `min-w-0`: lets the track hold its cap while the loading square asks for more, as the art's own frame
                does. */}
            <div className="min-w-0 sm:col-start-1 sm:row-span-2 sm:row-start-1">{art}</div>
            {/* REVIEW(HOO-921): the design menu's card text spacing. `centred`: from `sm` the text and the facts sit
                together in the middle of the art's height, 24px apart; their paddings (7px over the label's row, 13px
                under the facts) even out, as the 28px row centres the label 6px lower. */}
            {spacing === 'centred' ? (
                <div className="flex min-w-0 flex-col gap-3 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-center sm:gap-6">
                    {text}
                </div>
            ) : (
                text
            )}
        </div>
    );
}

/**
 * The card layout cut in two: the art on a card of its own, edge to edge, and the type label, the name and the facts
 * on another, side by side in the same columns (the left one hugs the art, up to 320px or half the row). Below `sm`
 * the two cards stack. The facts close the text card: a list across the card's full width below `sm`, plain label /
 * value pairs from it.
 */
function SplitLayout({ art, originalLink, label, name, specs }: CardLayoutProps) {
    return (
        // `max-sm:-mt-5` as in the wide layout. `322px`: the 320px art plus its card's border. The gap between the
        // cards is the NFToken grid's: 6px below `sm`, 12px from it.
        <div className="grid w-full gap-1.5 max-sm:-mt-5 sm:grid-cols-[fit-content(min(322px,calc(50%-0.375rem)))_minmax(0,1fr)] sm:gap-3">
            {/* No padding: the art fills the card, which takes the art's proportions (`w-fit`, and `self-start` against
                the taller text card) and clips its corners to its own. Below `sm` a tall art's card centres, as the
                art would. */}
            <div className={cn(CARD_SURFACE, 'w-fit min-w-0 max-w-full self-start overflow-hidden max-sm:mx-auto')}>
                {art}
            </div>
            {/* `justify-between`: the text card is at least as tall as the art card, and its facts keep to the
                bottom. */}
            {/* The label 24px under the art below `sm` (`max-sm:pt-2.5`), 16px under the card's top edge from it
                (`sm:pt-[9px]`, with the 1px border and the row's 6px). `gap-3`: at least 12px under the name. */}
            <div
                className={cn(
                    CARD_SURFACE,
                    SPLIT_PADDING,
                    'flex min-w-0 flex-col justify-between gap-3 max-sm:pt-2.5 sm:pt-[9px]',
                )}
            >
                <div className="min-w-0">
                    <CardHeading label={label} originalLink={originalLink} name={name} />
                </div>
                {/* Below `sm` the list reaches the card's edges with a line along its top, as on the single card. */}
                <div className="min-w-0 overflow-hidden max-sm:-mx-3 max-sm:-mb-3 max-sm:border-0 max-sm:border-t max-sm:border-solid max-sm:border-outer-space-800">
                    {specs}
                </div>
            </div>
        </div>
    );
}

// The text card keeps its content 12px from its border, as the Overview card's rows.
const SPLIT_PADDING = 'p-3';

/**
 * The type label over the name, with "View original" at the end of the label's row. The row's own height leaves 6px
 * under the label; `-mb-1` takes 4px of it back, so the name is 2px under the label. `min-h-7`: the row is as tall as
 * the button whether or not it is there, so the label keeps its distance from the card's top.
 */
function CardHeading({
    label,
    originalLink,
    name,
    rowClassName,
}: Pick<CardLayoutProps, 'label' | 'originalLink' | 'name'> & { rowClassName?: string }) {
    return (
        <div className="flex flex-col">
            <div className={cn('-mb-1 flex min-h-7 items-center justify-between gap-3', rowClassName)}>
                {/* The key-value rows' key gray, like "View original" beside it. */}
                <span className="text-xs font-normal uppercase text-outer-space-300">{label}</span>
                {originalLink}
            </div>
            {name}
        </div>
    );
}

// The NFToken NFT cards' surface.
const CARD_SURFACE = 'rounded-lg border border-solid border-outer-space-800 bg-outer-space-900';

// Beside the art at its top. `sm:pt-[7px]` on the card's 10px and its 1px border puts the label (centred in its 28px
// row) 24px from the card's top edge, as far as the facts' last line is from its bottom edge (`sm:pb-[13px]`); the
// border is why neither is a Tailwind step. Below `sm` the label is 24px under the art (`max-sm:pt-1.5` on the grid's
// 12px and the row's 6px), and `max-sm:pb-1.5` widens the gap under the name.
const CARD_TEXT_CLASSES =
    'flex min-w-0 flex-col gap-3 max-sm:pb-1.5 max-sm:pt-1.5 sm:col-start-2 sm:row-start-1 sm:pt-[7px]';

// Below `sm` the facts reach the card's border: the negative margins undo its padding, and a line runs along their
// top. `overflow-hidden` clips the lines the rows draw along the card's border (see `FACT_STRIP_CLASSES`). From `sm`
// no lines: the pairs keep to the bottom of the right column, as the `1fr` row above them takes the art's spare
// height, their last line 24px from the card's bottom edge.
const CARD_FACTS_CLASSES = [
    'min-w-0 -mx-2.5 -mb-2.5 overflow-hidden border-0 border-t border-solid border-outer-space-800',
    'sm:col-start-2 sm:row-start-2 sm:m-0 sm:border-t-0 sm:pb-[13px] sm:pr-3.5',
].join(' ');

// The text's side inset on the card: below `sm` 12px from its border with the card's 10px, as the Overview card's rows
// and the facts under it; from `sm` 24px from its right edge.
const TEXT_INSET = 'max-sm:px-0.5 sm:pr-3.5';

// One size below `sm` and one from it, whatever the column's width: 30px, what the name had at `xs`, and 42px, halfway
// between what it had at `md` (32px) and at `lg` (51px). `leading-tight`, because a long name wraps at these sizes.
const CARD_NAME_CLASSES = 'm-0 break-words text-[30px] font-normal leading-tight text-white sm:text-[42px]';

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
                    {/* From `sm` the keys get 80px (`sm:w-20`), not the Overview's share of the row: the labels are
                        short (the longest, "Collection", is 65px) and the values need the room. */}
                    <dt className={cn('flex-none text-sm font-normal text-outer-space-300', LABEL_WIDTH, 'sm:w-20')}>
                        {label}
                    </dt>
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
            // 12px from the card's border, as the Overview card's rows (`ROW_PADDING`) and the text above them
            // (`TEXT_INSET`, `SPLIT_PADDING`).
            layout: { card: 'px-3', split: 'px-3' },
        },
    },
);

// The art gets a slot and sizes itself inside it: it scales down to fit, keeps its proportions and sits at the slot's
// left, so the rounded corners always land on the art itself (`object-contain` in a wider box would round the box and
// leave the art's corners square). The slot hugs the art (`w-fit`): the browser carries the height cap (520px, 540px
// below `sm`) through
// the art's proportions, so a tall image gets a narrower slot and the text moves up to it. Below `sm` the slot may take
// the whole column, and a tall image that stops at the cap, narrower than the column, sits centred in it
// (`max-sm:mx-auto`); from `sm` (576px) the header's grid track caps it at 320px or half the row. `min-w-0` lets the
// track hold that cap while the loading square, which unlike the image can't shrink, asks for its full width.
const ART_FRAME_CLASSES = 'relative flex w-fit min-w-0 max-w-full flex-col items-start self-start max-sm:mx-auto';

// On a card the art gets the NFToken NFT cards' pair: 4px corners in an 8px card.
const ART_RADIUS = { false: 'rounded-lg', true: 'rounded' } as const;

// `sized`: once the art's own size is known, its width is the one that makes it as tall as the cap (`artStyle`), set
// per breakpoint through CSS variables, since an inline width can't follow a media query.
const nftArtVariants = cva('block h-auto max-h-[520px] max-w-full max-sm:max-h-[540px]', {
    defaultVariants: { onCard: false, sized: false },
    variants: {
        onCard: ART_RADIUS,
        sized: { false: 'w-auto', true: 'w-[var(--art-w)] max-sm:w-[var(--art-w-phone)]' },
    },
});

// While the art loads, a square holds the space the art will most likely take. It has a width of its own, because the
// art's slot takes its width from what it holds.
const nftArtPlaceholderVariants = cva(
    'aspect-square w-[min(520px,calc(100vw-2rem))] max-w-full max-sm:w-[min(540px,calc(100vw-2rem))]',
    {
        defaultVariants: { onCard: false },
        variants: { onCard: ART_RADIUS },
    },
);

const ART_PIXELS = 320;
// The height cap: the art is shown whole but can't stretch the page on either side, however odd its proportions. The
// width cap is the slot's. A phone's column is narrow, so a tall art gets 20px more there.
const MAX_HEIGHT = 520;
const MAX_HEIGHT_PHONE = 540;
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
                className={nftArtVariants({ onCard, sized: loaded !== undefined && artStyle(loaded) !== undefined })}
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
function artStyle({ width, height }: { width: number; height: number }): CSSProperties | undefined {
    if (width === 0 || height === 0) return undefined;
    return {
        '--art-w': `${Math.round((MAX_HEIGHT * width) / height)}px`,
        '--art-w-phone': `${Math.round((MAX_HEIGHT_PHONE * width) / height)}px`,
        imageRendering: Math.max(width, height) <= PIXEL_ART_MAX_SIDE ? 'pixelated' : undefined,
    } as CSSProperties;
}

/**
 * A quiet link to the image at its source, for when the proxied copy fails or someone wants the full file. A click
 * always asks first (`OriginalImageDialog`), and that dialog says what the site is, so no hint opens on hover.
 */
function OriginalLink({
    uri,
    look = 'link',
}: {
    uri?: string;
    /**
     * `ghost` is a `Button` `sm`-sized box with no outline, in the type label's gray, for the card headers' label row;
     * `row` is the value of the header's Original row, the image's site in the page's link green.
     */
    look?: 'link' | 'ghost' | 'row';
}) {
    if (!hasOriginal(uri)) return undefined;

    // The row's value is laid out as the Overview card's Website link: the text, then the inline arrow.
    const trigger =
        look === 'row' ? (
            <button type="button" className={originalLinkVariants({ look })}>
                {/* One flex item, so the button's baseline is its first line's: a button on its own would line up
                    with its label by its last line once the site wraps. */}
                <span>
                    <SiteName hostname={new URL(uri).hostname} />
                    <ExternalLinkMark />
                </span>
            </button>
        ) : (
            <button type="button" className={originalLinkVariants({ look })}>
                View original
                {/* 1px up: centred on the box, the icon sits low against the text's x-height. */}
                <ExternalLinkIcon size={12} className="-translate-y-px" />
            </button>
        );

    return <OriginalImageDialog uri={uri}>{trigger}</OriginalImageDialog>;
}

// The dialog would open any href; only an http(s) image gets the link at all, and the Original row with it.
function hasOriginal(uri: string | undefined): uri is string {
    return !!uri && !!getSafeExternalHref(uri);
}

// In the type label's gray so the header's two captions read as one: `link` in the plain header's `text-muted`, a
// quiet caption under the art; `ghost` in the card header's key gray (`text-outer-space-300`, the key-value rows'
// keys). `ghost` is the `Button` `sm` box (height, padding, rounding; the icon 4px closer) with a hover fill instead
// of an outline; its own classes, since `Button`'s ghost is white and recolouring it from here would mean overriding
// the base component.
const originalLinkVariants = cva('border-0 bg-transparent', {
    variants: {
        look: {
            ghost: 'inline-flex h-7 w-fit items-center gap-1 whitespace-nowrap rounded px-2 text-xs text-outer-space-300 hover:bg-neutral-800 hover:text-white',
            link: 'inline-flex w-fit items-center gap-1 whitespace-nowrap p-0 text-xs text-muted hover:text-white',
            // The colours of every other link on the page (`a` in `styles.css`), which this button stands with. Its one
            // item is plain text flow, so a site too long for the line wraps and the arrow follows its last line.
            row: 'inline-flex p-0 text-left text-sm text-[#33a382] hover:text-[#2b8a6e]',
        },
    },
});

/** A site's name that wraps after its dots (`<wbr>`), not in the middle of a word. */
function SiteName({ hostname }: { hostname: string }) {
    const parts = hostname.split('.');
    return (
        <>
            {parts.map((part, index) => (
                // The parts of a name can repeat (`a.a.com`), and they never reorder.
                <Fragment key={index}>
                    {part}
                    {index < parts.length - 1 && (
                        <>
                            .<wbr />
                        </>
                    )}
                </Fragment>
            ))}
        </>
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
export function NftCreatorsList({ creators }: { creators: NftHeaderModel['creators'] }) {
    // REVIEW(HOO-921): the design menu picks the share's place and the unverified mark; keep the winners.
    const share = useNftCreatorsShare();
    const unverified = useNftCreatorsUnverified();
    if (!creators || creators.length === 0) return <Muted />;

    if (share === 'inline') {
        // Each share right after its address; `flex-wrap` moves it to the next line when the two don't fit.
        return (
            <div className="flex min-w-0 flex-col gap-y-1">
                {creators.map(creator => (
                    <div key={creator.address} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                        <div className="min-w-0">
                            <Address pubkey={new PublicKey(creator.address)} link />
                        </div>
                        <CreatorShare creator={creator} unverified={unverified} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid min-w-0 grid-cols-[minmax(0,max-content)_1fr] items-baseline gap-x-1.5 gap-y-1 overflow-hidden">
            {creators.map(creator => (
                <Fragment key={creator.address}>
                    <div className="min-w-0">
                        <Address pubkey={new PublicKey(creator.address)} link />
                    </div>
                    <CreatorShare creator={creator} unverified={unverified} />
                </Fragment>
            ))}
        </div>
    );
}

// The royalty share in gray, and the mark of an unverified creator: the text, or below `sm` with the `icon` variant a
// question mark. `whitespace-nowrap`: the question mark stays on the share's line.
function CreatorShare({ creator, unverified }: { creator: NftCreator; unverified: NftCreatorsUnverified }) {
    return (
        <span className="whitespace-nowrap text-left text-outer-space-300">
            {creator.share}%
            {!creator.verified &&
                (unverified === 'icon' ? (
                    <>
                        <span className="max-sm:hidden"> · unverified</span>
                        <UnverifiedHint />
                    </>
                ) : (
                    ' · unverified'
                ))}
        </span>
    );
}

// Below `sm` "unverified" doesn't fit beside the share, so it shrinks to a question mark that explains itself on a tap
// (the tooltip opens on touch too). `-2px` sets the 13px icon on the text's optical centre, as `InfoTooltip` does.
function UnverifiedHint() {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="Unverified"
                    className="ml-1.5 inline-flex cursor-help border-0 bg-transparent p-0 align-[-2px] text-outer-space-300 sm:hidden"
                >
                    <HelpCircle size={13} />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{UNVERIFIED_CREATOR_HINT}</TooltipContent>
        </Tooltip>
    );
}

const UNVERIFIED_CREATOR_HINT = 'Unverified: this creator has not signed the NFT, so anyone could have listed them.';

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
