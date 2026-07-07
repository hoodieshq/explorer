import type { PublicKey } from '@solana/web3.js';
import type { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { useProgramMetadataSecurityTxt } from '@/app/entities/program-metadata';
import { useCluster } from '@/app/providers/cluster';
import { CardTitle } from '@/app/shared/ui/Card';
import {
    NEODYME_SECURITY_TXT_DOC_LINK,
    PMP_SECURITY_TXT_DOC_LINK,
} from '@/app/features/security-txt/lib/constants';
import { fromProgramData } from '@/app/features/security-txt/lib/fromProgramData';

export function ProgramSecurityTXTBadge({
    programData,
    programPubkey,
}: {
    programData: ProgramDataAccountInfo;
    programPubkey: PublicKey;
}) {
    const { securityTXT, error } = fromProgramData(programData);

    const { url, cluster } = useCluster();
    const { programMetadataSecurityTxt } = useProgramMetadataSecurityTxt(programPubkey.toBase58(), url, cluster);

    const maybeError = securityTXT || programMetadataSecurityTxt ? undefined : error;
    // Reference the Program Metadata doc only when it's uploaded; otherwise the Neodyme doc.
    const docLink = programMetadataSecurityTxt ? PMP_SECURITY_TXT_DOC_LINK : NEODYME_SECURITY_TXT_DOC_LINK;

    return <SecurityTXTBadge error={maybeError} href={docLink} />;
}

export function SecurityTXTBadge({ error, href }: { error?: string; href: string }) {
    if (error) {
        return (
            <CardTitle as="h3" ui="dashkit">
                <Badge ui="dashkit" variant="warning">
                    {error}
                </Badge>
            </CardTitle>
        );
    }

    return (
        <CardTitle as="h3" ui="dashkit">
            <Badge ui="dashkit" variant="success" className="cursor-pointer" asChild>
                <Link href={href} rel="noopener noreferrer" target="_blank">
                    Included
                    <ExternalLink className="ml-1.5" size={13} />
                </Link>
            </Badge>
        </CardTitle>
    );
}
