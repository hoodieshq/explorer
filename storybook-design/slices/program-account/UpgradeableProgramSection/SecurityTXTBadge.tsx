import type { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { useSecurityTxt } from '@/app/features/security-txt';
import { NO_SECURITY_TXT_ERROR } from '@/app/features/security-txt/lib/constants';
import { useClusterPath } from '@/app/utils/url';

// security.txt now resolves (PMP + Neodyme, both sources unified) via `useSecurityTxt(address)` —
// the former sync `fromProgramData` parse + separate `useProgramMetadataSecurityTxt` are gone.
// Mirrors app/features/security-txt/ui/SecurityTXTBadge.tsx.
export function ProgramSecurityTXTBadge({ programPubkey }: { programPubkey: PublicKey }) {
    const { securityTxt, isLoading } = useSecurityTxt(programPubkey.toBase58());
    const securityTabPath = useClusterPath({ pathname: `/address/${programPubkey.toBase58()}/security` });

    if (isLoading) return undefined;

    const maybeError = securityTxt ? undefined : NO_SECURITY_TXT_ERROR;

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
