'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'react-feather';

import { ExternalLink } from '@/app/components/shared/ui/external-link';

type Resource = {
    title: string;
    description: string;
    link: string;
    image?: string;
    imageBackground?: string;
};

const KICKER = 'font-mono text-xs uppercase tracking-widest text-heavy-metal-300';

const DEFAULT_RESOURCES: Resource[] = [
    {
        description: 'Get started in 5 minutes or less.',
        image: 'https://solana.com/opengraph/developers/docs/intro/installation',
        link: 'https://solana.com/docs/intro/installation',
        title: 'Setup your environment',
    },
    {
        description: 'Hands-on guide to the core concepts for building on Solana.',
        image: 'https://solana.com/_next/image?url=%2Fassets%2Fdocs%2Fintro%2Fquickstart%2Fpg-not-connected.png&w=1920&q=75',
        link: 'https://solana.com/docs/intro/quick-start',
        title: 'Quick Start Guide',
    },
    {
        description: '11 hours of video lessons on Solana development.',
        image: 'https://i.ytimg.com/vi/amAq-WHAFs8/maxresdefault.jpg',
        link: 'https://www.youtube.com/watch?v=amAq-WHAFs8',
        title: 'Developer Bootcamp',
    },
    {
        description: 'A course designed for EVM developers to learn Solana.',
        image: 'https://www.rareskills.io/wp-content/uploads/2024/08/og-image-rareskills.png',
        imageBackground: 'white',
        link: 'https://www.rareskills.io/solana-tutorial',
        title: '60 Days of Solana',
    },
];

export function DeveloperResources({ resources = DEFAULT_RESOURCES }: { resources?: Resource[] }) {
    return (
        <section aria-labelledby="dev-resources-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span id="dev-resources-heading" className={KICKER}>
                    Build on Solana
                </span>
                <span className="text-sm text-heavy-metal-400">
                    Find more on <ExternalLink href="https://solana.com/developers">solana.com/developers</ExternalLink>
                </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {resources.map(resource => (
                    <ResourceCard key={resource.link} {...resource} />
                ))}
            </div>
        </section>
    );
}

function ResourceCard({ title, description, image, link, imageBackground }: Resource) {
    const [loaded, setLoaded] = useState(false);

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 no-underline transition-colors hover:border-dark-accent"
        >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-heavy-metal-700 to-heavy-metal-900">
                {image && (
                    // eslint-disable-next-line @next/next/no-img-element -- external thumbnails from varied hosts; next/image would need per-domain config
                    <img
                        src={image}
                        alt=""
                        loading="lazy"
                        onLoad={() => setLoaded(true)}
                        onError={() => setLoaded(false)}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundColor: imageBackground, opacity: loaded ? 1 : 0 }}
                    />
                )}
                <ArrowUpRight
                    size={16}
                    className="absolute right-3 top-3 text-heavy-metal-300 transition-colors group-hover:text-dark-accent"
                    aria-hidden
                />
            </div>
            <div className="flex flex-col gap-1.5 p-4">
                <div className="text-base font-medium text-dark-foreground">{title}</div>
                <p className="m-0 text-sm leading-6 text-heavy-metal-300">{description}</p>
            </div>
        </a>
    );
}
