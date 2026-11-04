import { Copyable } from '@components/common/Copyable';
import { Slot } from '@components/common/Slot';
import { type Cluster, clusterName } from '@utils/cluster';
import { type ReactNode } from 'react';

import { ExternalLink } from '@/app/components/shared/ui/external-link';

import { type AlpenglowUpgrade } from '../lib/genesis-cert';

const ALPENGLOW_UPGRADE_URL = 'https://solana.com/upgrades/alpenglow';

export function BaseAlpenglowCard({ cluster, upgrade }: { cluster: Cluster; upgrade: AlpenglowUpgrade }) {
    const migrated = upgrade.kind === 'migrated';

    return (
        <section className="rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-heavy-metal-400">
                    <span aria-hidden>🏔</span>
                    Alpenglow · {clusterName(cluster)}
                </span>
                <ExternalLink className="text-sm text-dark-accent" href={ALPENGLOW_UPGRADE_URL}>
                    About the upgrade
                </ExternalLink>
            </div>

            <dl className="mt-4 flex flex-col gap-3">
                <Row label="Consensus">
                    {migrated ? (
                        <span className="text-dark-accent">Alpenglow</span>
                    ) : (
                        <span className="font-sans text-heavy-metal-400">TowerBFT — not activated</span>
                    )}
                </Row>
                {upgrade.kind === 'migrated' && (
                    <>
                        <Row label="Genesis slot">
                            <Slot slot={upgrade.cert.slot} link />
                        </Row>
                        <Row label="Certified block">
                            <span className="break-all">
                                <Copyable text={upgrade.cert.blockId}>{upgrade.cert.blockId}</Copyable>
                            </span>
                        </Row>
                    </>
                )}
            </dl>
        </section>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-0 border-t border-solid border-dark-border pt-3 first:border-t-0 first:pt-0">
            <dt className="shrink-0 text-sm text-heavy-metal-300">{label}</dt>
            <dd className="m-0 min-w-0 text-right font-mono text-sm text-dark-foreground">{children}</dd>
        </div>
    );
}
