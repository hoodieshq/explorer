import { NFTWideArt, NFTWideArtPlaceholder } from '@components/common/NFTWideArt';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { NftokenCardSpacing, NftokenOriginalLinkPlacement } from '@/app/shared/lib/nftoken-header-options';
import type { NftokenHeaderVariant } from '@/app/shared/lib/nftoken-header-variant';
import { LABEL_WIDTH } from '@/app/shared/ui/key-value';
import { pageTitleVariants } from '@/app/shared/ui/page-layout';

import type { NftokenAccount } from '../lib/nftoken-accounts';
import type { CollectionNftsState } from '../model/use-collection-nfts';
import type { NftokenMetadataState } from '../model/use-nftoken-metadata';
import { hasOriginal, OriginalLink } from './OriginalLink';

const COPY: Record<NftokenAccount['kind'], { label: string; missingName: string }> = {
    collection: { label: 'NFToken Collection', missingName: 'Unnamed collection' },
    nft: { label: 'NFToken NFT', missingName: 'Unnamed NFT' },
};

const METADATA_FAILED = 'Failed to load metadata';
// The metadata gave no answer to read a name from (no link, refused, or not JSON); the "Unnamed" copy is kept for
// metadata that loaded without a name.
const NAME_UNAVAILABLE = 'Name not loaded';

/** REVIEW(HOO-929): one label / value block of the card headers. */
type NftokenFact = { label: string; value: ReactNode };

/** An NFT's collection: where its page is, and its name once the collection's metadata loads. */
export type NftokenCollectionLink = { address: string; href: string; name?: string };

/**
 * The art full width below `sm` and up to half the row from it, then the type label, the name, the description and,
 * for a collection, the number of its NFTs: the Metaplex NFT header's layout from HOO-921. The mutability and the
 * account's other fields are in the Overview card under it.
 */
export function BaseNftokenHeader({
    kind,
    metadata,
    nfts,
    collection,
    variant = 'plain',
    originalLink = 'current',
    cardSpacing = 'stretch',
}: {
    kind: NftokenAccount['kind'];
    metadata: NftokenMetadataState;
    /** A collection's NFTs; leave out for an NFT. */
    nfts?: CollectionNftsState;
    /** An NFT's collection; leave out for an NFT outside any collection and for a collection. */
    collection?: NftokenCollectionLink;
    /** REVIEW(HOO-929): `card` puts the whole header on a card; `split` cuts it into an art card and a text card. */
    variant?: NftokenHeaderVariant;
    /** REVIEW(HOO-929): "View original" beside the type label (under the art for `plain`), or an Original row. */
    originalLink?: NftokenOriginalLinkPlacement;
    /** REVIEW(HOO-929): how the card layout spaces its text; the split layout has its own. */
    cardSpacing?: NftokenCardSpacing;
}) {
    const copy = COPY[kind];
    const loaded = metadata.kind === 'loaded' ? metadata.metadata : undefined;
    const originalInRow = originalLink === 'row';

    const facts: (NftokenFact | false | undefined)[] = [
        kind === 'collection'
            ? nfts && { label: 'Number of NFTs', value: <NftCount nfts={nfts} /> }
            : { label: 'Collection', value: collection ? <CollectionLink collection={collection} /> : <Muted /> },
        originalInRow &&
            hasOriginal(loaded?.image) && { label: 'Original', value: <OriginalLink uri={loaded?.image} look="row" /> },
    ];
    const shown = facts.filter((fact): fact is NftokenFact => !!fact);
    const specs =
        shown.length === 0 ? undefined : variant === 'plain' ? (
            shown.map(fact => (
                <Spec key={fact.label} label={fact.label}>
                    {fact.value}
                </Spec>
            ))
        ) : (
            <FactStrip facts={shown} />
        );

    // REVIEW(HOO-929): one of the layouts under comparison.
    const HeaderLayout = LAYOUTS[variant];

    if (metadata.kind === 'loading') {
        return (
            <HeaderLayout
                art={<NFTWideArtPlaceholder onCard={variant !== 'plain'} />}
                label={copy.label}
                name={<Skeleton className={nameSkeletonVariants({ variant })} />}
                specs={specs}
                spacing={cardSpacing}
            />
        );
    }

    const name = headerName(metadata, copy.missingName);

    return (
        <HeaderLayout
            art={
                <NFTWideArt
                    uri={loaded?.image}
                    onCard={variant !== 'plain'}
                    under={
                        variant === 'plain' &&
                        !originalInRow && (
                            <span className="sm:hidden">
                                <OriginalLink uri={loaded?.image} />
                            </span>
                        )
                    }
                />
            }
            originalLink={
                !originalInRow && <OriginalLink uri={loaded?.image} look={variant === 'plain' ? 'link' : 'ghost'} />
            }
            label={copy.label}
            name={
                <h2 className={nameVariants({ variant })}>
                    {/* A status in place of a name reads in the muted gray of empty values, not as a title. */}
                    {name.status ? <span className="text-outer-space-300">{name.text}</span> : name.text}
                </h2>
            }
            description={loaded?.description}
            specs={specs}
            spacing={cardSpacing}
        />
    );
}

type LayoutProps = {
    art: ReactNode;
    originalLink?: ReactNode;
    label: string;
    name: ReactNode;
    description?: string;
    /** Label / value rows under the name. */
    specs?: ReactNode;
    /** REVIEW(HOO-929): how the card layout spaces its text. */
    spacing?: NftokenCardSpacing;
};

/**
 * From `sm` a grid: the art in the first row of the left column, its "View original" link in the second, the text in
 * the first row of the right column, at the art's vertical centre. The left track (`fit-content`) hugs the art, up to
 * 320px or half the row (`0.75rem` is half the `gap-x-6`).
 */
function Layout({ art, originalLink, label, name, description, specs }: LayoutProps) {
    return (
        // `max-sm:-mt-5`: above the art the page stacks 36px (the layout's `pt-3` and the address header's `py-6`); while
        // the art sits above the text it should be 16px from the top, the same as from the page's side edge.
        <div className="grid w-full gap-y-2 max-sm:-mt-5 sm:grid-cols-[fit-content(min(320px,calc(50%-0.75rem)))_minmax(0,1fr)] sm:gap-x-6">
            {/* Below `sm` "View original" hangs under the art's right edge, in the gap above the text; from `sm` it is
                a line of its own under the art. */}
            {art}
            {originalLink && <div className="hidden sm:col-start-1 sm:row-start-2 sm:block">{originalLink}</div>}
            {/* `max-sm:mt-4`: below `sm` the type label sits 24px below the art (`gap-y-2` plus this). */}
            <div className="flex min-w-0 flex-col justify-center gap-3 max-sm:mt-4 sm:col-start-2 sm:row-start-1">
                {/* The label and the name are spaced like every other page's header (`PageHeader`). */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-normal uppercase text-muted">{label}</span>
                    {name}
                </div>
                <Body description={description} specs={specs} />
            </div>
        </div>
    );
}

/**
 * REVIEW(HOO-929): the whole header on a card, the NFT cards' surface. Beside the art the type label sits above the
 * name, with "View original" at the end of its row, then the description; the header's own facts close the card. From
 * `sm` the art takes the left column, the text the top of the right one and the facts its bottom; below `sm`
 * everything stacks under the art, and the facts are list rows across the card's full width.
 */
function CardLayout({ art, originalLink, label, name, description, specs, spacing = 'stretch' }: LayoutProps) {
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
                <Body description={description} />
            </div>
            {specs && <div className={CARD_FACTS_CLASSES}>{specs}</div>}
        </>
    );
    return (
        // `max-sm:-mt-5` as in the plain layout. `p-2.5`: the art sits 10px from the card's edges; the text gets more
        // (`TEXT_INSET`) so it isn't pressed to the border.
        <div className="grid w-full gap-y-3 rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 p-2.5 max-sm:-mt-5 sm:grid-cols-[fit-content(min(320px,calc(50%-0.75rem)))_minmax(0,1fr)] sm:grid-rows-[1fr_auto] sm:gap-x-6">
            {/* `min-w-0`: lets the track hold its cap while the loading square asks for more, as the art's own frame
                does. */}
            <div className="min-w-0 sm:col-start-1 sm:row-span-2 sm:row-start-1">{art}</div>
            {/* REVIEW(HOO-929): the design menu's card text spacing. `centred`: from `sm` the text and the facts sit
                together in the middle of the art's height, 24px apart. */}
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
 * REVIEW(HOO-929): the card layout cut in two: the art on a card of its own, edge to edge, and the type label, the
 * name, the description and the facts on another, side by side in the same columns (the left one hugs the art, up to
 * 320px or half the row). Below `sm` the two cards stack. The facts close the text card: a list across the card's full
 * width below `sm`, plain label / value pairs from it.
 */
function SplitLayout({ art, originalLink, label, name, description, specs }: LayoutProps) {
    return (
        // `max-sm:-mt-5` as in the plain layout. `322px`: the 320px art plus its card's border. The gap between the
        // cards is the NFT grid's (`BaseNftokenCollectionGrid`): 6px below `sm`, 12px from it.
        <div className="grid w-full gap-1.5 max-sm:-mt-5 sm:grid-cols-[fit-content(min(322px,calc(50%-0.375rem)))_minmax(0,1fr)] sm:gap-3">
            {/* No padding: the art fills the card, which takes the art's proportions (`w-fit`, and `self-start` against
                the taller text card) and clips its corners to its own. Below `sm` a tall art's card centres, as the
                art would. */}
            <div className={cn(CARD_SURFACE, 'w-fit min-w-0 max-w-full self-start overflow-hidden max-sm:mx-auto')}>
                {art}
            </div>
            {/* `justify-between`: the text card is at least as tall as the art card, and its facts keep to the
                bottom. The label 24px under the art below `sm` (`max-sm:pt-2.5`), 16px under the card's top edge
                from it (`sm:pt-[9px]`, with the 1px border and the row's 6px). `gap-3`: at least 12px under the
                text. */}
            <div
                className={cn(
                    CARD_SURFACE,
                    SPLIT_PADDING,
                    'flex min-w-0 flex-col justify-between gap-3 max-sm:pt-2.5 sm:pt-[9px]',
                )}
            >
                {/* `gap-1.5`: the description 6px under the name, as in the card layout (`CARD_TEXT_CLASSES`). */}
                <div className="flex min-w-0 flex-col gap-1.5">
                    <CardHeading label={label} originalLink={originalLink} name={name} />
                    <Body description={description} />
                </div>
                {/* Below `sm` the list reaches the card's edges with a line along its top, as on the single card. */}
                {specs && (
                    <div className="min-w-0 overflow-hidden max-sm:-mx-3 max-sm:-mb-3 max-sm:border-0 max-sm:border-t max-sm:border-solid max-sm:border-outer-space-800">
                        {specs}
                    </div>
                )}
            </div>
        </div>
    );
}

// The text card keeps its content 12px from its border, as the Overview card's rows.
const SPLIT_PADDING = 'p-3';

/**
 * REVIEW(HOO-929): the type label over the name, with "View original" at the end of the label's row. The row's own
 * height leaves 6px under the label; `-mb-1` takes 4px of it back, so the name is 2px under the label. `min-h-7`: the
 * row is as tall as the button whether or not it is there, so the label keeps its distance from the card's top.
 */
function CardHeading({
    label,
    originalLink,
    name,
    rowClassName,
}: Pick<LayoutProps, 'label' | 'originalLink' | 'name'> & { rowClassName?: string }) {
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

// REVIEW(HOO-929): the NFT cards' surface.
const CARD_SURFACE = 'rounded-lg border border-solid border-outer-space-800 bg-outer-space-900';

// REVIEW(HOO-929): the layouts under comparison.
const LAYOUTS: Record<NftokenHeaderVariant, (props: LayoutProps) => ReactNode> = {
    card: CardLayout,
    plain: Layout,
    split: SplitLayout,
};

// Beside the art at its top. `sm:pt-[7px]` on the card's 10px and its 1px border puts the label (centred in its 28px
// row) 24px from the card's top edge, as far as the facts' last line is from its bottom edge (`sm:pb-[13px]`); the
// border is why neither is a Tailwind step. Below `sm` the label is 24px under the art (`max-sm:pt-1.5` on the grid's
// 12px and the row's 6px), and `max-sm:pb-1.5` widens the gap under the text. `gap-1.5`: the description 6px under the
// name, half the 12px it had, so the two read as one block.
const CARD_TEXT_CLASSES =
    'flex min-w-0 flex-col gap-1.5 max-sm:pb-1.5 max-sm:pt-1.5 sm:col-start-2 sm:row-start-1 sm:pt-[7px]';

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

/**
 * REVIEW(HOO-929): the card layouts' facts. Below `sm` one column of Overview-like rows, label beside value, ruled on
 * every side; from `sm` plain label / value pairs with no lines.
 */
function FactStrip({ facts }: { facts: NftokenFact[] }) {
    return (
        <dl className={FACT_STRIP_CLASSES}>
            {facts.map(({ label, value }) => (
                <div key={label} className={FACT_CLASSES}>
                    {/* From `sm` the keys get 112px (`sm:w-28`), not the Overview's share of the row: the labels are
                        short and the values need the room. HOO-921's header gives its keys 80px; "Number of NFTs"
                        needs about 100px to stay on one line. */}
                    <dt className={cn('flex-none text-sm font-normal text-outer-space-300', LABEL_WIDTH, 'sm:w-28')}>
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

// Below `sm` the Overview row: label and value side by side, 12px from the card's border, as the Overview card's rows
// and the text above them (`TEXT_INSET`, `SPLIT_PADDING`). From `sm` a bare pair, spaced like the plain header's specs.
const FACT_CLASSES =
    'flex min-w-0 flex-row items-baseline gap-dk-4 border-0 border-b border-r border-solid border-outer-space-800 px-3 py-2.5 sm:gap-4 sm:border-0 sm:p-0';

function Body({ description, specs }: Pick<LayoutProps, 'description' | 'specs'>) {
    return (
        <>
            {/* `whitespace-pre-line` keeps the paragraphs a description is written in. `max-w-[420px]`: on a wide
                text column the lines stay short enough to read. */}
            {description && <p className="m-0 max-w-[420px] whitespace-pre-line break-words text-sm">{description}</p>}
            {/* `items-baseline` keeps a label level with its value's text; `mt-2` makes it 20px under the name. */}
            {specs && (
                <dl className="m-0 mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-sm">
                    {specs}
                </dl>
            )}
        </>
    );
}

// The card layouts' name: one size below `sm` and one from it, whatever the column's width: 30px, so a word as long as
// "purplesquirrel.glow" still fits a phone's card, and 42px. `leading-tight`, because a long name wraps at these sizes
// and `leading-none` would let its lines touch; the skeleton takes the same size times `leading-tight`.
const CARD_NAME_CLASSES = 'm-0 text-[30px] font-normal leading-tight text-white sm:text-[42px]';
const CARD_NAME_SKELETON_CLASSES = 'h-[37.5px] sm:h-[52.5px]';

const nameVariants = cva('break-words', {
    variants: {
        variant: { card: CARD_NAME_CLASSES, plain: pageTitleVariants(), split: CARD_NAME_CLASSES },
    },
});

const nameSkeletonVariants = cva('w-48', {
    variants: {
        variant: { card: CARD_NAME_SKELETON_CLASSES, plain: 'h-8', split: CARD_NAME_SKELETON_CLASSES },
    },
});

function Spec({ label, children }: { label: string; children: ReactNode }) {
    return (
        <>
            <dt className="font-normal text-outer-space-300">{label}</dt>
            <dd className="m-0 min-w-0 text-white">{children}</dd>
        </>
    );
}

/**
 * The collection's name, its short address until the name loads, linked to its page. No Verified badge, unlike the
 * Metaplex header: nothing here shows that the collection's authority approved the NFT.
 */
function CollectionLink({ collection }: { collection: NftokenCollectionLink }) {
    return (
        <Link href={collection.href} className={collectionLinkVariants({ named: collection.name !== undefined })}>
            {collection.name ?? shortAddress(collection.address)}
        </Link>
    );
}

// The name reads as text; the address that stands in while the name loads stays monospace like elsewhere.
const collectionLinkVariants = cva('block min-w-0 truncate', {
    variants: { named: { false: 'font-mono', true: '' } },
});

// `status`: the text says why there is no name rather than naming the account.
function headerName(
    metadata: Exclude<NftokenMetadataState, { kind: 'loading' }>,
    missingName: string,
): { text: string; status: boolean } {
    switch (metadata.kind) {
        case 'loaded':
            return { status: false, text: metadata.metadata.name ?? missingName };
        case 'unavailable':
            return { status: true, text: NAME_UNAVAILABLE };
        case 'failed':
            return { status: true, text: METADATA_FAILED };
    }
}

function shortAddress(address: string) {
    return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function Muted() {
    return <span className="text-outer-space-300">—</span>;
}

function NftCount({ nfts }: { nfts: CollectionNftsState }) {
    switch (nfts.kind) {
        case 'loading':
            return <Skeleton className="inline-block h-4 w-12 align-middle" />;
        case 'loaded':
            return nfts.nfts.length + nfts.undecodableCount;
        case 'unsupported':
        case 'refused':
        case 'failed':
            return 'Fetch Failed';
    }
}
