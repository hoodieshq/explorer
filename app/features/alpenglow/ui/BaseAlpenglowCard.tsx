import { Copyable } from '@components/common/Copyable';
import { Slot } from '@components/common/Slot';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { type Cluster, clusterName } from '@utils/cluster';
import { Info } from 'react-feather';

import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { KeyValue, TextValue } from '@/app/shared/ui/key-value';
import { SectionLinkAction, useSectionActionsLayout } from '@/app/shared/ui/section-action';

import { type AlpenglowUpgrade } from '../lib/genesis-cert';

const ALPENGLOW_UPGRADE_URL = 'https://solana.com/upgrades/alpenglow';

export function BaseAlpenglowCard({ cluster, upgrade }: { cluster: Cluster; upgrade: AlpenglowUpgrade }) {
    // REVIEW(home-key-value-cards): the design-menu variant for the title link; a constant once one is chosen.
    const actionsLayout = useSectionActionsLayout();
    return (
        <CollapsibleSection
            title={`Alpenglow on ${clusterName(cluster)}`}
            actions={
                <SectionLinkAction href={ALPENGLOW_UPGRADE_URL} icon={<Info />} label="About the upgrade">
                    <ExternalLink className="text-sm" href={ALPENGLOW_UPGRADE_URL}>
                        About the upgrade
                    </ExternalLink>
                </SectionLinkAction>
            }
            actionsLayout={actionsLayout}
            collapsible={false}
            fill
        >
            <KeyValue label="Consensus">
                {upgrade.kind === 'migrated' ? (
                    <TextValue mono={false}>Alpenglow</TextValue>
                ) : (
                    <span className="text-outer-space-300">TowerBFT — Alpenglow not activated</span>
                )}
            </KeyValue>
            {upgrade.kind === 'migrated' && (
                <>
                    <KeyValue label="Genesis slot">
                        <Slot slot={upgrade.cert.slot} link />
                    </KeyValue>
                    <KeyValue label="Certified block">
                        <Copyable text={upgrade.cert.blockId}>
                            <TextValue>{upgrade.cert.blockId}</TextValue>
                        </Copyable>
                    </KeyValue>
                </>
            )}
        </CollapsibleSection>
    );
}
