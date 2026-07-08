import { useAnchorProgram } from '@entities/idl';
import { PublicKey } from '@solana/web3.js';
import React, { Suspense } from 'react';

import { Address } from '@/app/components/common/Address';
import { LoadingCard } from '@/app/components/common/LoadingCard';
import { UpgradeableLoaderAccountData } from '@/app/providers/accounts';
import { useCluster } from '@/app/providers/cluster';
import {
    SQUADS_V3_ADDRESS,
    SQUADS_V4_ADDRESS,
    useSquadsMultisig,
    useSquadsMultisigLookup,
} from '@/app/providers/squadsMultisig';

import { KeyValue } from '../../key-value/KeyValue';
import { LABEL_WIDTH } from '../UpgradeableProgramSection/constants';
import { SectionCard } from './SectionCard';

/**
 * "Program Multisig" tab — redesigned in the spirit of UpgradeableProgramSection. The
 * Squads multisig details drop the right-aligned BaseTable in favour of left-aligned
 * `KeyValue` rows sharing the page-wide LABEL_WIDTH column.
 */
export function ProgramMultisigCard({ data }: { data: UpgradeableLoaderAccountData }) {
    return (
        <Suspense fallback={<LoadingCard message="Loading multisig information" />}>
            <ProgramMultisigCardInner programAuthority={data.programData?.authority} />
        </Suspense>
    );
}

function ProgramMultisigCardInner({ programAuthority }: { programAuthority: PublicKey | null | undefined }) {
    const { cluster, url } = useCluster();
    const { data: squadMapInfo } = useSquadsMultisigLookup(programAuthority, cluster);
    const anchorProgram = useAnchorProgram(
        squadMapInfo?.version === 'v3' ? SQUADS_V3_ADDRESS : SQUADS_V4_ADDRESS,
        url,
        cluster,
    );
    const { data: squadInfo } = useSquadsMultisig(
        anchorProgram.program,
        squadMapInfo?.multisig,
        cluster,
        squadMapInfo?.version,
    );

    let members: PublicKey[];
    if (squadInfo !== undefined && squadInfo?.version === 'v4') {
        members = squadInfo.multisig.members.map(obj => obj.key) ?? [];
    } else {
        members = squadInfo?.multisig.keys ?? [];
    }

    const memberCount =
        squadInfo?.version === 'v4' ? squadInfo?.multisig.members.length : squadInfo?.multisig.keys.length;

    return (
        <SectionCard title="Upgrade Authority Multisig Information">
            <KeyValue label="Multisig Program" labelWidth={LABEL_WIDTH} row>
                {squadMapInfo?.version === 'v4' ? 'Squads V4' : 'Squads V3'}
            </KeyValue>
            <KeyValue label="Multisig Program Id" labelWidth={LABEL_WIDTH} row>
                <Address
                    pubkey={new PublicKey(squadMapInfo?.version === 'v4' ? SQUADS_V4_ADDRESS : SQUADS_V3_ADDRESS)}
                    link
                />
            </KeyValue>
            <KeyValue label="Multisig Account" labelWidth={LABEL_WIDTH} row>
                {squadMapInfo?.isSquad ? <Address pubkey={new PublicKey(squadMapInfo.multisig)} link /> : null}
            </KeyValue>
            <KeyValue label="Multisig Approval Threshold" labelWidth={LABEL_WIDTH} row>
                {squadInfo?.multisig.threshold}
                {' of '}
                {memberCount}
            </KeyValue>
            {members.map((member, idx) => (
                <KeyValue key={idx} label={`Multisig Member ${idx + 1}`} labelWidth={LABEL_WIDTH} row>
                    <Address pubkey={member} link />
                </KeyValue>
            ))}
        </SectionCard>
    );
}
