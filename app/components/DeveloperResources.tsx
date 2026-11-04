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
        link: 'https://solana.com/docs/intro/installation',
        title: 'Setup your environment',
    },
    {
        description: 'Hands-on guide to the core concepts for building on Solana.',
        link: 'https://solana.com/docs/intro/quick-start',
        title: 'Quick Start Guide',
    },
    {
        description: '11 hours of video lessons on Solana development.',
        link: 'https://www.youtube.com/watch?v=amAq-WHAFs8',
        title: 'Developer Bootcamp',
    },
    {
        description: 'A course designed for EVM developers to learn Solana.',
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
                    <a
                        key={resource.link}
                        href={resource.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col gap-2 rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 p-5 no-underline transition-colors hover:border-dark-accent"
                    >
                        <ArrowUpRight
                            size={16}
                            className="self-end text-heavy-metal-500 transition-colors group-hover:text-dark-accent"
                            aria-hidden
                        />
                        <div className="text-base font-medium text-dark-foreground">{resource.title}</div>
                        <p className="m-0 text-sm leading-6 text-heavy-metal-300">{resource.description}</p>
                    </a>
                ))}
            </div>
        </section>
    );
}
