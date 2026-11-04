'use client';

import { useBuildClusterPath } from '@utils/url';
import Link from 'next/link';
import { ArrowUpRight, Flag, Search, Terminal } from 'react-feather';

import { KICKER } from '../lib/tokens';

type Tool = {
    title: string;
    description: string;
    pathname: string;
    Icon: typeof Search;
};

const TOOLS: Tool[] = [
    {
        Icon: Search,
        description:
            'Paste raw or encoded transaction data and decode it instruction by instruction — before you send.',
        pathname: '/tx/inspector',
        title: 'Transaction Inspector',
    },
    {
        Icon: Flag,
        description: 'Track every runtime feature gate, its SIMD, and the epoch it activates on each cluster.',
        pathname: '/feature-gates',
        title: 'Feature Gates',
    },
    {
        Icon: Terminal,
        description: 'Point an MCP client at the Explorer and let coding agents read decoded on-chain state.',
        pathname: '/mcp/start',
        title: 'MCP Server',
    },
];

export function ToolsSection() {
    const buildPath = useBuildClusterPath();

    return (
        <section aria-labelledby="home-tools-heading">
            <span className={KICKER}>Only here</span>
            <h2
                id="home-tools-heading"
                className="m-0 mt-2 text-2xl font-normal tracking-tight text-dark-foreground sm:text-3xl"
            >
                Tools you won’t find on other explorers
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {TOOLS.map(({ Icon, description, pathname, title }) => (
                    <Link
                        key={pathname}
                        href={buildPath(pathname)}
                        className="group flex flex-col gap-3 rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 p-5 no-underline transition-colors hover:border-dark-accent"
                    >
                        <div className="flex items-center justify-between">
                            <Icon size={20} className="text-dark-accent" aria-hidden />
                            <ArrowUpRight
                                size={16}
                                className="text-heavy-metal-500 transition-colors group-hover:text-dark-accent"
                                aria-hidden
                            />
                        </div>
                        <div className="text-base font-medium text-dark-foreground">{title}</div>
                        <p className="m-0 text-sm leading-6 text-heavy-metal-300">{description}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
