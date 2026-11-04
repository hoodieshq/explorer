import { Copyable } from '@components/common/Copyable';
import { Slot } from '@components/common/Slot';
import { Badge } from '@components/shared/ui/badge';
import { type Cluster, clusterName } from '@utils/cluster';
import { type ReactNode } from 'react';

import { ExternalLink } from '@/app/components/shared/ui/external-link';

import { type AlpenglowUpgrade } from '../lib/genesis-cert';

const ALPENGLOW_UPGRADE_URL = 'https://solana.com/upgrades/alpenglow';
const KICKER = 'font-mono text-xs uppercase tracking-widest text-heavy-metal-400';

export function BaseAlpenglowCard({ cluster, upgrade }: { cluster: Cluster; upgrade: AlpenglowUpgrade }) {
    const migrated = upgrade.kind === 'migrated';

    return (
        <section className="rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className={KICKER}>Consensus · {clusterName(cluster)}</span>
                <ExternalLink className="text-sm text-dark-accent" href={ALPENGLOW_UPGRADE_URL}>
                    About the upgrade
                </ExternalLink>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-normal text-dark-foreground">{migrated ? 'Alpenglow' : 'TowerBFT'}</span>
                {migrated ? (
                    <Badge variant="success" size="sm" pill>
                        Active
                    </Badge>
                ) : (
                    <Badge variant="gray" size="sm" pill>
                        Alpenglow not activated
                    </Badge>
                )}
            </div>

            {upgrade.kind === 'migrated' && (
                <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Genesis slot">
                        <Slot slot={upgrade.cert.slot} link />
                    </Field>
                    <Field label="Certified block">
                        <span className="break-all">
                            <Copyable text={upgrade.cert.blockId}>{upgrade.cert.blockId}</Copyable>
                        </span>
                    </Field>
                </dl>
            )}
        </section>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-heavy-metal-400">{label}</dt>
            <dd className="mt-1.5 min-w-0 font-mono text-sm text-dark-foreground">{children}</dd>
        </div>
    );
}
