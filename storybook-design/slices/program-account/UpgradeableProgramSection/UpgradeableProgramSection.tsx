import type { PublicKey } from '@solana/web3.js';
import { addressLabel } from '@/app/utils/tx';
import type {
    ProgramAccountInfo,
    ProgramDataAccountInfo,
} from '@/app/validators/accounts/upgradeable-program';
import Link from 'next/link';
import React from 'react';

import { useRefreshAccount } from '@/app/entities/account';
import type { Account } from '@/app/providers/accounts';
import { useCluster } from '@/app/providers/cluster';
import { useSquadsMultisigLookup } from '@/app/providers/squadsMultisig';
import { Cluster } from '@/app/utils/cluster';
import { useClusterPath } from '@/app/utils/url';

import { KeyValue } from '../../key-value/KeyValue';

import { Address } from './Address';
import { AccountCard } from './AccountCard';
import { InfoTooltip } from './InfoTooltip';
import { ProgramSecurityTXTBadge } from './SecurityTXTBadge';
import { ProgramSecurityTXTLabel } from './SecurityTXTLabel';
import { Slot } from './Slot';
import { SolBalance } from './SolBalance';
import { VerifiedProgramBadge } from './VerifiedProgramBadge';
import { LABEL_WIDTH } from './constants';

/**
 * "Program Account" — first bordered block on the program-account page.
 * Redesigned to match the Overview card from H-explorer-pre-sorybook: the title
 * + actions sit above the card (`headerOutside`) instead of inside a card-header
 * band, and every field is a stacked/flex label-value row (`AccountCardRow`)
 * instead of a two-column right-aligned table row.
 */
export function UpgradeableProgramSection({
    account,
    programAccount,
    programData,
}: {
    account: Account;
    programAccount: ProgramAccountInfo;
    programData: ProgramDataAccountInfo | undefined;
}) {
    const refresh = useRefreshAccount();
    const { cluster } = useCluster();
    const { data: squadMapInfo } = useSquadsMultisigLookup(programData?.authority, cluster);

    const label = addressLabel(account.pubkey.toBase58(), cluster);

    return (
        <AccountCard
            title={`${programData === undefined ? 'Closed ' : ''}Program Account`}
            account={account}
            headerOutside
            refresh={() => refresh(account.pubkey, 'parsed')}
            analyticsSection="program_section"
        >
            <KeyValue label="Address" labelWidth={LABEL_WIDTH}>
                <Address pubkey={account.pubkey} raw />
            </KeyValue>
            {label && (
                <KeyValue label="Address Label" labelWidth={LABEL_WIDTH}>
                    {label}
                </KeyValue>
            )}
            <KeyValue label="Balance (SOL)" labelWidth={LABEL_WIDTH}>
                <SolBalance lamports={account.lamports} />
            </KeyValue>
            <KeyValue label="Executable" labelWidth={LABEL_WIDTH}>
                {programData !== undefined ? 'Yes' : 'No'}
            </KeyValue>
            <KeyValue
                label={`Executable Data${programData === undefined ? ' (Closed)' : ''}`}
                labelWidth={LABEL_WIDTH}
            >
                <Address pubkey={programAccount.programData} link />
            </KeyValue>
            {programData !== undefined && (
                <>
                    <KeyValue label="Upgradeable" labelWidth={LABEL_WIDTH}>
                        {programData.authority !== null ? 'Yes' : 'No'}
                    </KeyValue>
                    <KeyValue label={<VerifiedLabel />} labelWidth={LABEL_WIDTH}>
                        <VerifiedProgramBadge programData={programData} pubkey={account.pubkey} />
                    </KeyValue>
                    <KeyValue label={<ProgramSecurityTXTLabel programPubkey={account.pubkey} />} labelWidth={LABEL_WIDTH}>
                        <ProgramSecurityTXTBadge programData={programData} programPubkey={account.pubkey} />
                    </KeyValue>
                    <KeyValue label="Last Deployed Slot" labelWidth={LABEL_WIDTH}>
                        <Slot slot={programData.slot} link />
                    </KeyValue>
                    {programData.authority !== null && (
                        <KeyValue label="Upgrade Authority" labelWidth={LABEL_WIDTH}>
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0">
                                    <Address pubkey={programData.authority} link />
                                </span>
                                {cluster == Cluster.MainnetBeta && squadMapInfo?.isSquad ? (
                                    <MultisigBadge pubkey={account.pubkey} />
                                ) : null}
                            </div>
                        </KeyValue>
                    )}
                </>
            )}
        </AccountCard>
    );
}

function MultisigBadge({ pubkey }: { pubkey: PublicKey }) {
    const programMultisigTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/program-multisig` });
    return (
        <Link className="badge bg-success-soft rank shrink-0" href={programMultisigTabPath}>
            Program Multisig
        </Link>
    );
}

function VerifiedLabel() {
    return (
        <InfoTooltip text="Verified builds allow users to ensure that the hash of the on-chain program matches the hash of the program of the given codebase (registry hosted by osec.io).">
            <Link
                rel="noopener noreferrer"
                target="_blank"
                href="https://github.com/Ellipsis-Labs/solana-verifiable-build"
            >
                <span>Verified Build</span>
            </Link>
        </InfoTooltip>
    );
}
