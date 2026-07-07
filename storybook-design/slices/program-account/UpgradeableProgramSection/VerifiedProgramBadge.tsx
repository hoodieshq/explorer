import type { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { useCluster } from '@/app/providers/cluster';
import { CardTitle } from '@/app/shared/ui/Card';
import { Cluster } from '@/app/utils/cluster';
import { useIsProgramVerified } from '@/app/utils/verified-builds';
import type { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';

type BadgeVariant = NonNullable<Parameters<typeof Badge>[0]['variant']>;

const VERIFIED_BUILD_DOC_LINK = 'https://github.com/Ellipsis-Labs/solana-verifiable-build';

export function VerifiedProgramBadge({
    programData,
    pubkey,
}: {
    programData: ProgramDataAccountInfo;
    pubkey: PublicKey;
}) {
    const { cluster } = useCluster();
    const {
        isLoading,
        data: isVerified,
        error,
    } = useIsProgramVerified({
        programData,
        programId: pubkey,
    });

    if (cluster !== Cluster.MainnetBeta) {
        return (
            <CardTitle as="h3" ui="dashkit">
                <Badge ui="dashkit" variant="warning">
                    Verified Builds only available on Mainnet
                </Badge>
            </CardTitle>
        );
    } else if (isLoading) {
        return (
            <CardTitle as="h3" ui="dashkit">
                <Badge ui="dashkit">Loading...</Badge>
            </CardTitle>
        );
    } else if (error) {
        return (
            <CardTitle as="h3" ui="dashkit">
                <Badge ui="dashkit" variant="warning">
                    Error fetching verified build information
                </Badge>
            </CardTitle>
        );
    } else {
        const badgeVariant: BadgeVariant = isVerified ? 'success' : 'warning';
        const badgeText = isVerified ? 'Program Source Verified' : 'Program Not Verified';

        return (
            <CardTitle as="h3" ui="dashkit">
                <Badge ui="dashkit" variant={badgeVariant} className="cursor-pointer" asChild>
                    <Link href={VERIFIED_BUILD_DOC_LINK} rel="noopener noreferrer" target="_blank">
                        {badgeText}
                        <ExternalLink className="ml-1.5" size={13} />
                    </Link>
                </Badge>
            </CardTitle>
        );
    }
}
