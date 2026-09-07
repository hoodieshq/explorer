'use client';

import { type ClusterState, rpcEndpoint, StateContext, toConnectableUrl } from '@entities/cluster';
import { ClusterStatusButton } from '@features/cluster-switcher';
import { Cluster, ClusterStatus, clusterUrl } from '@utils/cluster';
import type { ReactNode } from 'react';

/**
 * The real `ClusterStatusButton` in each of its states, driven by a fabricated `StateContext` rather than
 * a copy of its markup — a gallery that reimplements the component stops telling the truth the first time
 * the component changes. `useCluster` reads nothing but this context, so a provider per sample is the
 * whole mechanism.
 */
interface Sample {
    /** Which provenances collapse into this same rendering. */
    covers: string;
    colour: string;
    /** The endpoint the provider would have derived is filled in on the way to the context, since every
     *  sample is a decided one — there is no pending custom URL to hold it back. */
    state: Omit<ClusterState, 'connectableUrl'>;
    title: string;
}

const REMOTE_CUSTOM = rpcEndpoint('https://rpc.example.com/?api-key=not-a-real-key');

const SAMPLES: Sample[] = [
    {
        colour: '#1dd79b',
        covers: 'Also how a local validator renders — only its label differs, showing the full href with its port.',
        state: { selection: { cluster: Cluster.MainnetBeta }, status: ClusterStatus.Connected },
        title: 'Connected · known cluster',
    },
    {
        colour: '#e08214',
        covers: 'The amber provenance treatment, laid over the status variant. Remote custom endpoints only — a local validator stays green.',
        state: {
            selection: { cluster: Cluster.Custom, endpoint: REMOTE_CUSTOM },
            status: ClusterStatus.Connected,
        },
        title: 'Connected · remote custom RPC',
    },
    {
        colour: '#fa62fc',
        covers: 'The `warning` variant, which is magenta in this palette rather than amber.',
        state: { selection: { cluster: Cluster.MainnetBeta }, status: ClusterStatus.Connecting },
        title: 'Connecting · known cluster',
    },
    {
        // Renders magenta, not amber, and that is a bug rather than a decision. The component asks for
        // both `bg-[#fa62fc]` (the `warning` variant) and `bg-[#e08214]` (provenance); `cn` is plain clsx
        // with no tailwind-merge, so both survive and stylesheet order picks the winner. It happens to
        // pick amber over `primary` and magenta over `warning` — the amber intent holds in one state and
        // silently loses in this one.
        colour: '#fa62fc',
        covers: 'BUG: should be amber like the connected custom endpoint above, but the magenta status variant wins. Both background utilities are emitted and stylesheet order decides, since `cn` does not merge Tailwind classes.',
        state: {
            selection: { cluster: Cluster.Custom, endpoint: REMOTE_CUSTOM },
            status: ClusterStatus.Connecting,
        },
        title: 'Connecting · remote custom RPC',
    },
    {
        colour: '#b45be1',
        covers: 'The only state that ignores provenance — a failed remote custom endpoint looks exactly like this.',
        state: { selection: { cluster: Cluster.MainnetBeta }, status: ClusterStatus.Failure },
        title: 'Failure · any endpoint',
    },
];

export function ClusterStates() {
    return (
        <div className="min-h-screen bg-heavy-metal-950 px-6 py-8 text-white">
            <header className="mb-6">
                <h1 className="mb-1 text-lg font-medium">Cluster selector · every state</h1>
                <p className="m-0 max-w-[70ch] text-sm text-neutral-400">
                    Two independent dimensions: connection status carries the icon, provenance carries the colour. Five
                    renderings in total — the buttons below are the shipping component, so what you see is what the
                    navbar shows.
                </p>
            </header>

            <div className="flex flex-wrap gap-4">
                {SAMPLES.map(sample => (
                    <Card key={sample.title} sample={sample} />
                ))}
            </div>

            <p className="mt-8 max-w-[70ch] text-xs text-neutral-500">
                Clicking any sample opens the real cluster panel — the button&apos;s own click handler is intact, and
                only its state is fabricated.
            </p>
        </div>
    );
}

function Card({ sample }: { sample: Sample }) {
    return (
        <section className="flex w-[280px] flex-col gap-3 rounded-xl border border-solid border-white/10 bg-[#121716]/90 p-4">
            <div className="flex items-baseline justify-between gap-2">
                <h2 className="m-0 text-xs uppercase tracking-wide text-neutral-400">{sample.title}</h2>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-neutral-500">
                    <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: sample.colour }}
                        aria-hidden
                    />
                    {sample.colour}
                </span>
            </div>

            {/* The bar caps the button at 210px, so the sample is capped the same way — a wider box would
                show a button the navbar never renders. */}
            <Preview state={sample.state}>
                <div className="max-w-[210px]">
                    <ClusterStatusButton />
                </div>
            </Preview>

            <p className="m-0 text-[11px] leading-snug text-neutral-500">{sample.covers}</p>
        </section>
    );
}

function Preview({ state, children }: { children: ReactNode; state: Omit<ClusterState, 'connectableUrl'> }) {
    return (
        <StateContext.Provider value={{ ...state, connectableUrl: toConnectableUrl(clusterUrl(state.selection)) }}>
            {children}
        </StateContext.Provider>
    );
}
