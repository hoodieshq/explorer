'use client';

import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cva } from 'class-variance-authority';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { BookOpen } from 'react-feather';

import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { SectionLinkAction, useSectionActionsLayout } from '@/app/shared/ui/section-action';

type Resource = {
    title: string;
    description: string;
    image: string;
    link: string;
    imageBackground?: string;
};

const DEVELOPERS_URL = 'https://solana.com/developers';

const DEFAULT_RESOURCES: Resource[] = [
    {
        description: 'Get started in 5 minutes or less!',
        image: 'https://solana.com/opengraph/developers/docs/intro/installation',
        link: 'https://solana.com/docs/intro/installation',
        title: 'Setup Your Solana Environment',
    },
    {
        description: 'Hands-on guide to the core concepts for building on Solana',
        image: 'https://solana.com/_next/image?url=%2Fassets%2Fdocs%2Fintro%2Fquickstart%2Fpg-not-connected.png&w=1920&q=75',
        link: 'https://solana.com/docs/intro/quick-start',
        title: 'Quick Start Guide',
    },
    {
        description: '11 hours of video lessons on Solana Development',
        image: 'https://i.ytimg.com/vi/amAq-WHAFs8/maxresdefault.jpg',
        link: 'https://www.youtube.com/watch?v=amAq-WHAFs8',
        title: 'Solana Developer Bootcamp',
    },
    {
        description: 'A course designed for EVM developers to learn Solana',
        image: 'https://www.rareskills.io/wp-content/uploads/2024/08/og-image-rareskills.png',
        imageBackground: 'white',
        link: 'https://www.rareskills.io/solana-tutorial',
        title: '60 Days of Solana',
    },
];

export function DeveloperResources({ resources = DEFAULT_RESOURCES }: { resources?: Resource[] }) {
    // REVIEW(home-key-value-cards): the design-menu variant for the title link; a constant once one is chosen.
    const actionsLayout = useSectionActionsLayout();
    const [scrollerRef, visible] = useVisibleItems<HTMLDivElement>(resources.length);
    // With every card in view there is nothing to scroll to, so the dots only show while some are out of it. They are
    // for phones only (xxs, xs); `sm:hidden` on the row drops them from there up.
    const scrollable = !visible.every(Boolean);
    return (
        <CollapsibleSection
            title="Kickstart your development journey on Solana"
            actions={
                <SectionLinkAction href={DEVELOPERS_URL} icon={<BookOpen />} label="Find more on solana.com/developers">
                    <span className="text-sm text-outer-space-300">
                        Find more on <ExternalLink href={DEVELOPERS_URL}>solana.com/developers</ExternalLink>
                    </span>
                </SectionLinkAction>
            }
            actionsLayout={actionsLayout}
            collapsible={false}
            fill
        >
            <div ref={scrollerRef} className="flex gap-6 overflow-auto p-3">
                {resources.map(resource => (
                    <ResourceCard key={resource.link} {...resource} />
                ))}
            </div>
            {scrollable && (
                // One dot per card, lit while that card is on screen: the count says how many there are, the lit
                // run says where the row is scrolled. Decorative, so hidden from assistive tech, which reads the list.
                <div aria-hidden className="flex justify-center gap-1.5 pb-3 sm:hidden">
                    {resources.map((resource, index) => (
                        <span key={resource.link} className={dotVariants({ visible: visible[index] ?? false })} />
                    ))}
                </div>
            )}
        </CollapsibleSection>
    );
}

function ResourceCard({ title, description, image, link, imageBackground }: Resource) {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="flex flex-col" style={{ height: '200px', width: '250px' }}>
            <div className="mb-3 w-full">
                <ExternalLink href={link} className="hover:cursor-pointer">
                    <div className="bg-heavy-metal-700" style={{ height: '120px', width: '250px' }}>
                        {image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={image}
                                alt={`${title} preview`}
                                onLoad={() => setLoaded(true)}
                                onError={() => setLoaded(false)}
                                style={{
                                    backgroundColor: imageBackground,
                                    display: loaded ? 'block' : 'none',
                                    height: '120px',
                                    objectFit: 'cover',
                                    width: '250px',
                                }}
                            />
                        )}
                    </div>
                </ExternalLink>
            </div>
            <div className="flex flex-col gap-1 text-sm">
                <p className="m-0">{title}</p>
                <p className="m-0 line-clamp-3 whitespace-normal text-outer-space-300">{description}</p>
            </div>
        </div>
    );
}

const dotVariants = cva('size-1.5 rounded-full transition-colors', {
    defaultVariants: { visible: false },
    variants: { visible: { false: 'bg-outer-space-700', true: 'bg-white' } },
});

// A card counts as on screen once half of it is: a sliver at the edge reads as "more this way", not as seen.
const VISIBLE_RATIO = 0.5;

/** Which direct children of the returned ref's element are on screen inside it, in order. All, until measured. */
function useVisibleItems<T extends HTMLElement>(count: number): [RefObject<T | null>, boolean[]] {
    const ref = useRef<T>(null);
    const [visible, setVisible] = useState<boolean[]>(() => Array<boolean>(count).fill(true));

    useEffect(() => {
        const root = ref.current;
        if (!root || typeof IntersectionObserver === 'undefined') return;

        const items = Array.from(root.children);
        const observer = new IntersectionObserver(
            entries => {
                setVisible(previous => {
                    const next = items.map((_item, index) => previous[index] ?? true);
                    for (const entry of entries) {
                        const index = items.indexOf(entry.target);
                        if (index >= 0) next[index] = entry.intersectionRatio >= VISIBLE_RATIO;
                    }
                    return next;
                });
            },
            { root, threshold: VISIBLE_RATIO },
        );
        items.forEach(item => observer.observe(item));
        return () => observer.disconnect();
    }, [count]);

    return [ref, visible];
}
