import type { PublicKey } from '@solana/web3.js';
import type { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { useProgramMetadataSecurityTxt } from '@/app/entities/program-metadata';
import { useCluster } from '@/app/providers/cluster';
import { useClusterPath } from '@/app/utils/url';
import { fromProgramData } from '@/app/features/security-txt/lib/fromProgramData';

export function ProgramSecurityTXTBadge({
    programData,
    programPubkey,
}: {
    programData: ProgramDataAccountInfo;
    programPubkey: PublicKey;
}) {
    const { securityTXT, error } = fromProgramData(programData);
    const securityTabPath = useClusterPath({ pathname: `/address/${programPubkey.toBase58()}/security` });

    const { url, cluster } = useCluster();
    const { programMetadataSecurityTxt } = useProgramMetadataSecurityTxt(programPubkey.toBase58(), url, cluster);

    const maybeError = securityTXT || programMetadataSecurityTxt ? undefined : error;

    // Clean design-system (tw) badge; the "Security.txt" link navigates to the security tab.
    return <SecurityTXTBadge error={maybeError} href={securityTabPath} />;
}

// Presentational Security.txt badge — the whole value is a single soft badge (pre-existing
// content), rebuilt on the tw `Badge` instead of dashkit. With an error it shows the error text
// itself; otherwise "Included" links to the security tab. `whitespace-normal` lets a long error
// wrap in a narrow column (tailwind-merge overrides the badge's base `whitespace-nowrap`).
export function SecurityTXTBadge({ error, href, size = 'xs' }: { error?: string; href: string; size?: 'xs' | 'sm' }) {
    if (error) {
        return (
            <Badge
                className="relative -top-0.5 justify-start whitespace-normal text-left"
                size={size}
                tone="soft"
                ui="tw"
                variant="warning"
            >
                {error}
            </Badge>
        );
    }

    return (
        <Badge
            className="relative -top-0.5 cursor-pointer justify-start whitespace-normal text-left"
            size={size}
            tone="soft"
            ui="tw"
            variant="success"
            asChild
        >
            <Link href={href} rel="noopener noreferrer" target="_blank">
                Included
                <ExternalLink />
            </Link>
        </Badge>
    );
}
