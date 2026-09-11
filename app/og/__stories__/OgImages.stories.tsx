/* Every share image the app can generate, on one page.
 *
 * The two OG routes each already have a story file next to their component, but
 * they sit in different corners of the sidebar (Features/Receipt and
 * Features/FeatureGate) and neither shows the other. What a share image needs
 * reviewing against is the rest of the set — the same logo, the same margins,
 * the same date format on every card — so the catalogue is the view that makes
 * a drift visible. It adds no fixtures of its own: every card here is the same
 * args the component's own story renders, so the two cannot disagree.
 *
 * Caveat worth keeping in mind while looking at it: this is React in a browser,
 * while production draws these with satori (`ImageResponse`), which supports a
 * subset of CSS and only the fonts `loadOgFonts()` hands it. The catalogue is
 * for composition and content, not for a pixel comparison with what X will show.
 */
import type { Meta, StoryObj } from '@storybook-config/types';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { IMAGE_SIZE as FEATURE_GATE_SIZE } from '@/app/features/feature-gate/constants';
import { BaseFeatureGateImage } from '@/app/features/feature-gate/ui/BaseFeatureGateImage';
import {
    defaultReceipt,
    receiptLargeAmountWithMemo,
    receiptMultiTokenTransfer,
    receiptMultiTokenTransferWithLongMemo,
    receiptMultiTokenTransferWithMemo,
    receiptMultiTransfer3,
    receiptMultiTransfer9,
    receiptTokenTransferSimple,
    receiptWithMemo,
} from '@/app/features/receipt/ui/__stories__/receipt-fixtures';
import { BaseReceiptImage, IMAGE_SIZE as RECEIPT_SIZE } from '@/app/features/receipt/ui/BaseReceiptImage';

import { FIRST_RELEASE_FRAMES } from './first-release-frames';

/* The faces these cards are drawn in, from the same files `loadOgFonts()` packs
 * into the OG function — so the preview is the type the generated image will be.
 *
 * It has to be declared somewhere: Storybook's Rubik comes from next/font at
 * 300/400/700 only (app/styles), and both the receipt and the .pen designs ask
 * for 500 — CSS resolves a missing 500 *down* to 400, so every semibold line was
 * rendering regular. Declared here rather than in .storybook/preview so the
 * catalogue is self-contained: no other story's type changes underfoot.
 */
const FACES = [
    ['Rubik', 400, 'Rubik-Regular'],
    ['Rubik', 500, 'Rubik-Medium'],
    ['Rubik', 600, 'Rubik-SemiBold'],
    ['Roboto Mono', 400, 'RobotoMono-Regular'],
    ['Roboto Mono', 500, 'RobotoMono-Medium'],
    ['Roboto Mono', 600, 'RobotoMono-SemiBold'],
] as const;

const FONT_FACES = FACES.map(
    ([family, weight, file]) => `@font-face {
    font-family: '${family}';
    font-style: normal;
    font-weight: ${weight};
    src: url('/fonts/${file}.ttf') format('truetype');
}`,
).join('\n');

type Card = {
    /**
     * States of one card — Success and Failed, Verified and Unverified — share a
     * group, and the group's name becomes their one heading. A card that is a
     * case rather than a state has none and stands on its own.
     */
    group?: string;
    /** Unique within its section; the React key. */
    id: string;
    label: string;
    render: () => ReactNode;
    /** Story id, when the card has a story of its own to open. */
    storyId?: string;
    /** The page title X draws over the image; drives the overlay. */
    title: string;
};

/** A run of cards drawn under one heading, or a single card under none. */
type Block = { cards: Card[]; key: string; title?: string };

function blocksOf(cards: Card[]): Block[] {
    return cards.reduce<Block[]>((blocks, card) => {
        const open = blocks[blocks.length - 1];
        if (card.group && open?.title === card.group) open.cards.push(card);
        else blocks.push({ cards: [card], key: card.id, title: card.group });
        return blocks;
    }, []);
}

/** Every card in these sections has a story next to its component. */
const withStories = (cards: Card[]): Card[] => cards.map(card => ({ ...card, storyId: card.id }));

type Section = {
    cards: Card[];
    size: { height: number; width: number };
    title: string;
};

// The titles the app puts on the pages these images are shared from — the text
// X prints over the card when the overlay is on. Formats copied from where they
// are built: app/tx/[signature]/page.tsx and features/feature-gate/lib.
const SIGNATURE = '5ZPbKwHtR9kQmVeXsL7dPnF4jUwCzT2bYaGm9F7xXpn';
const RECEIPT_TITLE = `Receipt | ${SIGNATURE.slice(0, 16)}... | Solana`;
const gateTitle = (title: string) => `Feature Gate | ${title} | Solana`;

const RECEIPT_CARDS: Card[] = [
    {
        id: 'features-receipt-basereceiptimage--default',
        label: 'Default',
        render: () => <BaseReceiptImage data={defaultReceipt} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--large-amount',
        label: 'Large amount',
        render: () => <BaseReceiptImage data={receiptLargeAmountWithMemo} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--long-memo',
        label: 'Long memo',
        render: () => <BaseReceiptImage data={receiptWithMemo} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--token-transfer',
        label: 'Token transfer',
        render: () => <BaseReceiptImage data={receiptTokenTransferSimple} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--multi-transfer-3',
        label: 'Multi transfer · 3',
        render: () => <BaseReceiptImage data={receiptMultiTransfer3} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--multi-transfer-9',
        label: 'Multi transfer · 9',
        render: () => <BaseReceiptImage data={receiptMultiTransfer9} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--multi-token-transfer',
        label: 'Multi token transfer',
        render: () => <BaseReceiptImage data={receiptMultiTokenTransfer} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--multi-token-transfer-with-memo',
        label: 'Multi token · memo',
        render: () => <BaseReceiptImage data={receiptMultiTokenTransferWithMemo} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--multi-token-transfer-with-long-memo',
        label: 'Multi token · long memo',
        render: () => <BaseReceiptImage data={receiptMultiTokenTransferWithLongMemo} />,
        title: RECEIPT_TITLE,
    },
    {
        id: 'features-receipt-basereceiptimage--no-receipt',
        label: 'No receipt',
        render: () => <BaseReceiptImage data={undefined} />,
        title: RECEIPT_TITLE,
    },
];

const FEATURE_GATE_CARDS: Card[] = [
    {
        id: 'features-featuregate-basefeaturegateimage--default',
        label: 'Default',
        render: () => <BaseFeatureGateImage simds={['148']} title="MoveStake and MoveLamports" />,
        title: gateTitle('MoveStake and MoveLamports'),
    },
    {
        id: 'features-featuregate-basefeaturegateimage--multiple-simds',
        label: 'Multiple SIMDs',
        render: () => <BaseFeatureGateImage simds={['47', '61']} title="Enable address lookup table program" />,
        title: gateTitle('Enable address lookup table program'),
    },
    {
        id: 'features-featuregate-basefeaturegateimage--multiline-title',
        label: 'Multiline title',
        render: () => (
            <BaseFeatureGateImage
                simds={['321']}
                title="Instruction Data Pointer in VM Register 2 with Extended Buffer Support"
            />
        ),
        title: gateTitle('Instruction Data Pointer in VM Register 2 with Extended Buffer Support'),
    },
    {
        id: 'features-featuregate-basefeaturegateimage--truncated-title',
        label: 'Truncated title',
        render: () => (
            <BaseFeatureGateImage
                simds={['118']}
                title="Enable Partitioned Epoch Rewards Distribution Across Multiple Blocks with Automatic Stake Account Crediting and Comprehensive Validator Performance Tracking Including Cross-Cluster Synchronization of Reward Calculations and Delinquency Penalty Adjustments for Low-Performing Nodes"
            />
        ),
        title: gateTitle(
            'Enable Partitioned Epoch Rewards Distribution Across Multiple Blocks with Automatic Stake Account Crediting',
        ),
    },
    {
        id: 'features-featuregate-basefeaturegateimage--no-simd',
        label: 'No SIMD',
        render: () => <BaseFeatureGateImage simds={[]} title="Deprecate legacy transaction format" />,
        title: gateTitle('Deprecate legacy transaction format'),
    },
];

/* The designs from the OG gallery, generated straight out of the .pen by
 * ALX_LOCAL/og-gallery/to-storybook.py. Nothing renders these in the app yet —
 * they are here so the proposal and what ships can be read in one place, at the
 * same size, under the same overlay. */
const designCards = (section: string): Card[] =>
    FIRST_RELEASE_FRAMES.filter(frame => frame.section === section).map(frame => ({
        group: frame.label,
        id: frame.frameId,
        label: frame.state,
        render: () => <div dangerouslySetInnerHTML={{ __html: frame.html }} />,
        title: frame.title,
    }));

const SECTIONS: Section[] = [
    {
        cards: designCards('Transactions'),
        size: RECEIPT_SIZE,
        title: 'Transactions',
    },
    {
        cards: designCards('Accounts'),
        size: RECEIPT_SIZE,
        title: 'Accounts',
    },
    {
        cards: withStories(RECEIPT_CARDS),
        size: RECEIPT_SIZE,
        title: 'Receipt',
    },
    {
        cards: withStories(FEATURE_GATE_CARDS),
        size: FEATURE_GATE_SIZE,
        title: 'Feature gate',
    },
];

const MUTED = '#8A938F';
const HAIRLINE = '#FFFFFF1F';
const SELECTED = '#FFFFFF14';
const RAIL_WIDTH = 260;
// What X actually shows: a `summary_large_image` card is drawn 504px wide in the
// timeline, so that chip is the card at the size people will really see it.
const X_DISPLAY_WIDTH = 504;
const SIZE_CHIPS: { label: string; value: 'fit' | number }[] = [
    { label: 'Fit', value: 'fit' },
    { label: `X · ${X_DISPLAY_WIDTH}`, value: X_DISPLAY_WIDTH },
    { label: 'Half · 600', value: 600 },
    { label: 'Full · 1200', value: 1200 },
];
const GRID_GAP = 24;
const PANE_PADDING = 20;

/* The pill X prints over a shared card, at X's own measurements.
 *
 * A card never carries its page title, but the timeline does: X draws the
 * <title> over the bottom-left corner of the image, on top of whatever the
 * design put there. At its 504px display width the pill is inset 12px, 20px
 * tall, 13px text on a 4px radius, black at 77% — which converts to 28 / 48 /
 * 30 / 10 in the card's own 1200-wide pixels. It is drawn over the scaled card
 * rather than inside it, because X draws it in screen pixels over a scaled-down
 * image and so must this. A viewing tool: nothing here belongs to a design. */
function TitleOverlay({ scale, text }: { scale: number; text: string }) {
    if (!text) return null;
    const u = (value: number) => value * scale;
    return (
        <span
            style={{
                alignItems: 'center',
                background: 'rgba(0, 0, 0, .77)',
                borderRadius: u(10),
                bottom: u(28),
                color: '#fff',
                display: 'flex',
                font: `400 ${u(30)}px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                height: u(48),
                left: u(28),
                maxWidth: `calc(100% - ${u(56)}px)`,
                overflow: 'hidden',
                padding: `0 ${u(10)}px`,
                pointerEvents: 'none',
                position: 'absolute',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                zIndex: 2,
            }}
        >
            {text}
        </span>
    );
}

function Frame({ card, overlay, scale, size }: { card: Card; overlay: boolean; scale: number; size: Section['size'] }) {
    return (
        <figure style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, width: size.width * scale }}>
            {/* The state reads above the card, beside the type that heads the
                block — Transaction · Success, Transaction · Failed — rather than
                under it, where it was one more line of caption to skip. */}
            {card.storyId ? (
                <a
                    href={`/?path=/story/${card.storyId}`}
                    style={{ color: 'inherit', fontSize: 13, fontWeight: 500 }}
                    target="_top"
                >
                    {card.label}
                </a>
            ) : (
                <span style={{ fontSize: 13, fontWeight: 500 }}>{card.label}</span>
            )}
            <div
                style={{
                    // The card is drawn at its true 1200×630 and scaled as a whole, so
                    // every measurement inside it keeps its proportion — nothing reflows
                    // at a smaller size the way a resized box would.
                    height: size.height * scale,
                    outline: `1px solid ${HAIRLINE}`,
                    overflow: 'hidden',
                    position: 'relative',
                    width: size.width * scale,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        height: size.height,
                        transform: `scale(${scale})`,
                        transformOrigin: '0 0',
                        width: size.width,
                    }}
                >
                    {card.render()}
                </div>
                {overlay ? <TitleOverlay scale={scale} text={card.title} /> : null}
            </div>
        </figure>
    );
}

function RailButton({
    children,
    onSelect,
    selected,
    trailing,
}: {
    children: ReactNode;
    onSelect: () => void;
    selected: boolean;
    trailing?: ReactNode;
}) {
    return (
        <button
            onClick={onSelect}
            style={{
                alignItems: 'baseline',
                background: selected ? SELECTED : 'transparent',
                border: 0,
                borderRadius: 6,
                color: selected ? 'inherit' : MUTED,
                cursor: 'pointer',
                display: 'flex',
                font: 'inherit',
                fontSize: 13,
                fontWeight: selected ? 500 : 400,
                gap: 8,
                justifyContent: 'space-between',
                padding: '6px 8px',
                textAlign: 'left',
                width: '100%',
            }}
            type="button"
        >
            <span>{children}</span>
            {trailing ? <span style={{ color: MUTED, fontSize: 11 }}>{trailing}</span> : null}
        </button>
    );
}

function Chip({ children, onSelect, selected }: { children: ReactNode; onSelect: () => void; selected: boolean }) {
    return (
        <button
            onClick={onSelect}
            style={{
                background: selected ? SELECTED : 'transparent',
                border: `1px solid ${selected ? 'transparent' : HAIRLINE}`,
                borderRadius: 6,
                color: selected ? 'inherit' : MUTED,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 12,
                padding: '3px 10px',
            }}
            type="button"
        >
            {children}
        </button>
    );
}

function ChipRow({ children, label }: { children: ReactNode; label: string }) {
    return (
        <span style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
            <span style={{ color: MUTED, fontSize: 12 }}>{label}</span>
            {children}
        </span>
    );
}

function OgImageCatalogue() {
    const [cardSize, setCardSize] = useState<'fit' | number>('fit');
    const [overlay, setOverlay] = useState(true);
    const [paneWidth, setPaneWidth] = useState(0);
    // Which section the reader is in. It follows the scroll rather than a click:
    // the rail moves the list, it does not choose what the list contains.
    const [current, setCurrent] = useState(SECTIONS[0].title);
    const pane = useRef<HTMLDivElement>(null);
    const headings = useRef<Record<string, HTMLElement | null>>({});

    // The right pane's width decides how big a card can be drawn, and it changes
    // with the Storybook panel, not with the window — so it is measured rather
    // than derived from the viewport. Measured straight away as well as observed:
    // a ResizeObserver only delivers on a frame, and a preview that is laid out
    // but not painted (a hidden panel, a background tab) would sit at the initial
    // guess until something forced a repaint.
    useEffect(() => {
        const element = pane.current;
        if (!element) return;
        const measure = () => setPaneWidth(element.clientWidth - PANE_PADDING * 2);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    // The heading nearest the top of the pane is the section being read; the one
    // above it stays current until its successor actually reaches the top, which
    // is what keeps the rail from flickering between two names mid-scroll.
    useEffect(() => {
        const element = pane.current;
        if (!element) return;
        const track = () => {
            const top = element.getBoundingClientRect().top;
            const reached = SECTIONS.filter(section => {
                const heading = headings.current[section.title];
                return heading && heading.getBoundingClientRect().top - top <= 24;
            });
            setCurrent((reached[reached.length - 1] ?? SECTIONS[0]).title);
        };
        track();
        element.addEventListener('scroll', track, { passive: true });
        return () => element.removeEventListener('scroll', track);
    }, []);

    // Two across: the width where a family of cards is comparable rather than
    // just visible. A single card is reached through its own story, from the
    // link in its caption.
    const columns = 2;
    const available = Math.max(paneWidth - GRID_GAP * (columns - 1), 0) / columns;
    // Until the pane has been measured — first paint, or a panel that opens at
    // zero width — half size is the honest guess. Fitting to a width of 0 would
    // otherwise pin every card at the minimum and leave it there.
    const fitted = paneWidth > 0 ? Math.min(1, Math.max(available / RECEIPT_SIZE.width, 0.15)) : 0.5;
    const scale = cardSize === 'fit' ? fitted : cardSize / RECEIPT_SIZE.width;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <style>{FONT_FACES}</style>
            <nav
                style={{
                    borderRight: `1px solid ${HAIRLINE}`,
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    gap: 2,
                    overflowY: 'auto',
                    padding: '12px 10px 24px',
                    width: RAIL_WIDTH,
                }}
            >
                {SECTIONS.map(section => (
                    <RailButton
                        key={section.title}
                        onSelect={() =>
                            headings.current[section.title]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                        selected={current === section.title}
                        trailing={String(section.cards.length)}
                    >
                        {section.title}
                    </RailButton>
                ))}
            </nav>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                <header
                    style={{
                        alignItems: 'center',
                        borderBottom: `1px solid ${HAIRLINE}`,
                        display: 'flex',
                        flexShrink: 0,
                        flexWrap: 'wrap',
                        gap: 18,
                        padding: '10px 20px',
                    }}
                >
                    <ChipRow label="Size">
                        {SIZE_CHIPS.map(chip => (
                            <Chip
                                key={chip.label}
                                onSelect={() => setCardSize(chip.value)}
                                selected={cardSize === chip.value}
                            >
                                {chip.label}
                            </Chip>
                        ))}
                    </ChipRow>
                    <ChipRow label="Title overlay">
                        <Chip onSelect={() => setOverlay(false)} selected={!overlay}>
                            Off
                        </Chip>
                        <Chip onSelect={() => setOverlay(true)} selected={overlay}>
                            On
                        </Chip>
                    </ChipRow>
                </header>
                <div ref={pane} style={{ overflow: 'auto', padding: PANE_PADDING }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {SECTIONS.map(section => (
                            <section key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                {/* The gallery's own section heading, a quarter down from its
                                    40px: the gallery gives a section a full-width column to
                                    head, this one shares a pane with a rail. What carries it
                                    here is the space above it, not the size. */}
                                <h2
                                    ref={element => {
                                        headings.current[section.title] = element;
                                    }}
                                    style={{
                                        fontSize: 30,
                                        fontWeight: 500,
                                        letterSpacing: '-.5px',
                                        lineHeight: 1.1,
                                        // The air belongs to the heading, not to the space
                                        // between two sections — the first one gets it too,
                                        // the way the gallery gives every region 80px above
                                        // its title.
                                        margin: '84px 0 0',
                                    }}
                                >
                                    {section.title}
                                </h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: GRID_GAP }}>
                                    {blocksOf(section.cards).map(block => (
                                        <div
                                            key={block.key}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 10,
                                                // A block is as wide as the states it holds, so the
                                                // pair takes the row it needs and single cards keep
                                                // pairing up beside each other.
                                                width:
                                                    block.cards.length * section.size.width * scale +
                                                    (block.cards.length - 1) * GRID_GAP,
                                            }}
                                        >
                                            {block.title ? (
                                                <h3
                                                    style={{
                                                        fontSize: 16,
                                                        fontWeight: 500,
                                                        letterSpacing: '-.3px',
                                                        lineHeight: 1.15,
                                                        // Eight more above it than the block's own
                                                        // gap: a type heading belongs to the cards
                                                        // under it, not to the row above.
                                                        margin: '8px 0 0',
                                                    }}
                                                >
                                                    {block.title}
                                                </h3>
                                            ) : null}
                                            <div style={{ display: 'flex', gap: GRID_GAP }}>
                                                {block.cards.map(card => (
                                                    <Frame
                                                        card={card}
                                                        key={card.id}
                                                        overlay={overlay}
                                                        scale={scale}
                                                        size={section.size}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const meta: Meta<typeof OgImageCatalogue> = {
    component: OgImageCatalogue,
    parameters: {
        layout: 'fullscreen',
    },
    title: 'Features/OG Image Previews',
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Every OG share image, preview by preview: the types on the left, the cards on the right. */
export const Catalogue: Story = {};
