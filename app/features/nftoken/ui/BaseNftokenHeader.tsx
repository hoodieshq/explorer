import { NFTWideArt, NFTWideArtPlaceholder } from '@components/common/NFTWideArt';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { NftokenHeaderVariant } from '@/app/shared/lib/nftoken-header-variant';
import { LABEL_WIDTH } from '@/app/shared/ui/key-value';
import { pageTitleVariants } from '@/app/shared/ui/page-layout';

import type { NftokenAccount } from '../lib/nftoken-accounts';
import type { CollectionNftsState } from '../model/use-collection-nfts';
import type { NftokenMetadataState } from '../model/use-nftoken-metadata';
import { OriginalLink } from './OriginalLink';

const COPY: Record<NftokenAccount['kind'], { label: string; missingName: string }> = {
    collection: { label: 'NFToken Collection', missingName: 'Unnamed collection' },
    nft: { label: 'NFToken NFT', missingName: 'Unnamed NFT' },
};

const METADATA_FAILED = 'Failed to load metadata';
// The metadata gave no answer to read a name from (no link, refused, or not JSON); the "Unnamed" copy is kept for
// metadata that loaded without a name.
const NAME_UNAVAILABLE = 'Name not loaded';

/** REVIEW(HOO-929): one label / value block of the card header. */
export type NftokenFact = { label: string; value: ReactNode };

/** An NFT's collection: where its page is, and its name once the collection's metadata loads. */
export type NftokenCollectionLink = { address: string; href: string; name?: string };

/**
 * The art full width below `sm` and up to half the row from it, then the type label, the name, the description and,
 * for a collection, the number of its NFTs: the Metaplex NFT header's layout from HOO-921. The mutability it used to show is in the
 * Overview card now.
 */
export function BaseNftokenHeader({
    kind,
    metadata,
    nfts,
    collection,
    facts = [],
    actions,
    raw,
    variant = 'plain',
}: {
    kind: NftokenAccount['kind'];
    metadata: NftokenMetadataState;
    /** A collection's NFTs; leave out for an NFT. */
    nfts?: CollectionNftsState;
    /** An NFT's collection; leave out for an NFT outside any collection and for a collection. */
    collection?: NftokenCollectionLink;
    /** REVIEW(HOO-929): the Overview card's rows, which only the card variant shows, after its own. */
    facts?: NftokenFact[];
    /** REVIEW(HOO-929): the Overview card's buttons (Refresh, Raw, Download), which only the card variant shows. */
    actions?: ReactNode;
    /** REVIEW(HOO-929): the raw account rows, shown in the facts' place while Raw is pressed. */
    raw?: ReactNode;
    /** REVIEW(HOO-929): `card` puts the whole header on a card, with a name up to 54px. */
    variant?: NftokenHeaderVariant;
}) {
    const copy = COPY[kind];
    const own: NftokenFact | undefined =
        kind === 'collection'
            ? nfts && { label: 'Number of NFTs', value: <NftCount nfts={nfts} /> }
            : { label: 'Collection', value: collection ? <CollectionLink collection={collection} /> : <Muted /> };
    const allFacts = own ? [own, ...facts] : facts;
    const specs =
        variant !== 'plain'
            ? (raw ?? <FactStrip facts={allFacts} layout={variant} />)
            : own && <Spec label={own.label}>{own.value}</Spec>;

    // REVIEW(HOO-929): one of the two layouts under comparison.
    const HeaderLayout = LAYOUTS[variant];

    if (metadata.kind === 'loading') {
        return (
            <HeaderLayout
                art={<NFTWideArtPlaceholder onCard={variant !== 'plain'} />}
                actions={actions}
                label={copy.label}
                name={<Skeleton className={nameSkeletonVariants({ variant })} />}
                specs={specs}
            />
        );
    }

    const loaded = metadata.kind === 'loaded' ? metadata.metadata : undefined;
    const name = headerName(metadata, copy.missingName);

    return (
        <HeaderLayout
            art={
                <NFTWideArt
                    uri={loaded?.image}
                    onCard={variant !== 'plain'}
                    under={
                        variant === 'plain' && (
                            <span className="sm:hidden">
                                <OriginalLink uri={loaded?.image} />
                            </span>
                        )
                    }
                />
            }
            originalLink={<OriginalLink uri={loaded?.image} look={ORIGINAL_LINK_LOOKS[variant]} />}
            actions={actions}
            label={copy.label}
            name={
                <h2 className={nameVariants({ variant })}>
                    {/* A status in place of a name reads in the muted gray of empty values, not as a title. */}
                    {name.status ? <span className="text-outer-space-300">{name.text}</span> : name.text}
                </h2>
            }
            description={loaded?.description}
            specs={specs}
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
    /** REVIEW(HOO-929): the card layout's buttons; the plain one leaves them to the Overview card. */
    actions?: ReactNode;
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
 * name, with "View original" at the end of its row, then the description; the header's own fact closes the card. From
 * `sm` the art takes the left column, the text the top of the right one and the fact its bottom; below `sm`
 * everything stacks under the art, and the fact is a list row across the card's full width.
 */
function CardLayout({ art, originalLink, label, name, description, specs }: LayoutProps) {
    return (
        // `max-sm:-mt-5` as in the plain layout. `p-2.5`: the art sits 10px from the card's edges; the text gets more
        // (`TEXT_INSET`) so it isn't pressed to the border.
        <div className="grid w-full gap-y-3 rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 p-2.5 max-sm:-mt-5 sm:grid-cols-[fit-content(min(320px,calc(50%-0.75rem)))_minmax(0,1fr)] sm:grid-rows-[1fr_auto] sm:gap-x-6">
            {/* `min-w-0`: lets the track hold its cap while the loading square asks for more, as the art's own frame
                does. */}
            <div className="min-w-0 sm:col-start-1 sm:row-span-2 sm:row-start-1">{art}</div>
            <div className={cn(CARD_TEXT_CLASSES, TEXT_INSET)}>
                {/* The label and the name are spaced like every other page's header (`PageHeader`). */}
                <div className="flex flex-col gap-1.5">
                    {/* The negative right margin takes back part of the text's inset (`TEXT_INSET`), so "View original"
                        sits 14px from the card's right edge. */}
                    <div className="flex items-center justify-between gap-3 max-sm:-mr-0.5 sm:-mr-2.5">
                        {/* The key-value rows' key gray, like "View original" beside it. */}
                        <span className="text-xs font-normal uppercase text-outer-space-300">{label}</span>
                        {originalLink}
                    </div>
                    {name}
                </div>
                <Body description={description} />
            </div>
            {specs && <div className={CARD_FACTS_CLASSES}>{specs}</div>}
        </div>
    );
}

/**
 * REVIEW(HOO-929): the card layout cut in two: the art on a card of its own and the text with the facts on another,
 * side by side in the same columns (the left one hugs the art, up to 320px or half the row). Below `sm` the two cards
 * stack. The name and the description open the text card, and the facts close it: a list across the card's full
 * width below `sm`, plain label / value pairs from it.
 */
function SplitLayout({ art, originalLink, actions, label, name, description, specs }: LayoutProps) {
    return (
        // `max-sm:-mt-5` as in the plain layout. `346px`: the 320px art plus its card's padding and border.
        <section className="flex w-full flex-col gap-3 max-sm:-mt-5">
            <TitleRow label={label} originalLink={originalLink} actions={actions} />
            {/* The gap between the cards is the NFT grid's (`BaseNftokenCollectionGrid`): 6px below `sm`, 12px from it. */}
            <div className="grid w-full gap-1.5 sm:grid-cols-[fit-content(min(346px,calc(50%-0.375rem)))_minmax(0,1fr)] sm:gap-3">
                {/* `self-start`: the card is as tall as the art, however tall the text card beside it grows. */}
                <div className={cn(CARD_SURFACE, SPLIT_PADDING, 'min-w-0 self-start')}>{art}</div>
                {/* `justify-between`: the text card is at least as tall as the art card, and its facts keep to the
                    bottom. */}
                <div className={cn(CARD_SURFACE, SPLIT_PADDING, 'flex min-w-0 flex-col justify-between gap-6')}>
                    {/* `[container-type:inline-size]`: the name's size follows this card's width (see `nameVariants`). */}
                    <div className="flex min-w-0 flex-col gap-3 [container-type:inline-size]">
                        {name}
                        <Body description={description} />
                    </div>
                    {/* Below `sm` the list reaches the card's edges with a line along its top, as on the single card. */}
                    {specs && (
                        <div className="min-w-0 overflow-hidden max-sm:-mx-2.5 max-sm:-mb-2.5 max-sm:border-0 max-sm:border-t max-sm:border-solid max-sm:border-outer-space-800">
                            {specs}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// Both split cards keep their content the same distance from their edges: 10px below `sm`, 12px from it, which
// follows the gap between them.
const SPLIT_PADDING = 'p-2.5 sm:p-3';

/** REVIEW(HOO-929): the card layouts' title row, spaced like the Overview card's (`OverviewCard`), in its place. */
function TitleRow({ label, originalLink, actions }: Pick<LayoutProps, 'label' | 'originalLink' | 'actions'>) {
    return (
        <div className="flex min-h-[1.75rem] flex-wrap items-center justify-between gap-2">
            <div className="text-lg font-normal text-white">{label}</div>
            <div className="flex items-center gap-2">
                {originalLink}
                {actions}
            </div>
        </div>
    );
}

// REVIEW(HOO-929): the NFT cards' surface.
const CARD_SURFACE = 'rounded-lg border border-solid border-outer-space-800 bg-outer-space-900';

// REVIEW(HOO-929): the split layout's "View original" sits among the Overview's outlined buttons; the card layout's,
// alone beside the type label, drops the outline.
const ORIGINAL_LINK_LOOKS = { card: 'ghost', plain: 'link', split: 'button' } as const;

// REVIEW(HOO-929): the layouts under comparison.
const LAYOUTS: Record<NftokenHeaderVariant, (props: LayoutProps) => ReactNode> = {
    card: CardLayout,
    plain: Layout,
    split: SplitLayout,
};

// Beside the art at its top, the label row 16px from the card's edge (`sm:pt-1.5` on the card's 10px). `[container-type:inline-size]`: the name's size follows this column's width (see
// `nameVariants`).
const CARD_TEXT_CLASSES =
    'flex min-w-0 flex-col gap-3 [container-type:inline-size] sm:col-start-2 sm:row-start-1 sm:pt-1.5';

// Below `sm` the facts reach the card's border: the negative margins undo its padding, and a line runs along their
// top. `overflow-hidden` clips the lines the rows draw along the card's border (see `factStripVariants`). From `sm` no
// lines: the pairs keep to the bottom of the right column, as the `1fr` row above them takes the art's spare height,
// 24px from the card's bottom edge.
const CARD_FACTS_CLASSES = [
    'min-w-0 -mx-2.5 -mb-2.5 overflow-hidden border-0 border-t border-solid border-outer-space-800',
    'sm:col-start-2 sm:row-start-2 sm:m-0 sm:border-t-0 sm:pb-3.5 sm:pr-3.5',
].join(' ');

// The text's side inset on the card: 16px from its edges below `sm`, 24px from its right edge from `sm`.
const TEXT_INSET = 'max-sm:px-1.5 sm:pr-3.5';

/**
 * REVIEW(HOO-929): the card layouts' facts. Below `sm` one column of Overview-like rows, label beside value, ruled on
 * every side; from `sm` plain label / value pairs with no lines.
 */
function FactStrip({ facts, layout }: { facts: NftokenFact[]; layout: FactLayout }) {
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

type FactLayout = Exclude<NftokenHeaderVariant, 'plain'>;

// Below `sm` the Overview row: label and value side by side, the text as far from the card's edges as the card's
// other text. From `sm` a bare pair, spaced like the plain header's specs.
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

function Body({ description, specs }: Pick<LayoutProps, 'description' | 'specs'>) {
    return (
        <>
            {/* `whitespace-pre-line` keeps the paragraphs a description is written in. */}
            {description && <p className="m-0 whitespace-pre-line break-words text-sm">{description}</p>}
            {/* `items-baseline` keeps a label level with its value's text; `mt-2` makes it 20px under the name. */}
            {specs && (
                <dl className="m-0 mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-sm">
                    {specs}
                </dl>
            )}
        </>
    );
}

// `card`: sized by the text column, not the window (`cqi`, a hundredth of the column's width; the column is a size
// container, see `CARD_TEXT_CLASSES`), so the name stops growing once the page reaches its fixed width; the skeleton
// takes the same size times `leading-tight`. 30px at the least, so a word as long as "purplesquirrel.glow" still fits a phone's card, 54px at the most, which the widest
// column reaches. `leading-tight`, because a long name wraps at these sizes and `leading-none` would let its lines
// touch.
const nameVariants = cva('break-words', {
    variants: {
        variant: {
            card: 'm-0 text-[length:clamp(30px,9cqi,54px)] font-normal leading-tight text-white',
            plain: pageTitleVariants(),
            split: 'm-0 text-[length:clamp(30px,9cqi,54px)] font-normal leading-tight text-white',
        },
    },
});

const nameSkeletonVariants = cva('w-48', {
    variants: {
        variant: {
            card: 'h-[calc(clamp(30px,9cqi,54px)*1.25)]',
            plain: 'h-8',
            split: 'h-[calc(clamp(30px,9cqi,54px)*1.25)]',
        },
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
