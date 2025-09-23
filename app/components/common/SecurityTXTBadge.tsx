import { PublicKey } from '@solana/web3.js';
import { fromProgramData, NO_SECURITY_TXT_ERROR } from '@utils/security-txt';
import { useClusterPath } from '@utils/url';
import { ProgramDataAccountInfo } from '@validators/accounts/upgradeable-program';
import Link from 'next/link';

import { useCluster } from '@/app/providers/cluster';
import { useProgramMetadataSecurityTxt } from '@/app/providers/program-metadata/useProgramMetadataSecurityTxt';

export function ProgramSecurityTXTBadge({ programData, pubkey }: { programData: ProgramDataAccountInfo; pubkey: PublicKey }) {
    const { securityTXT } = fromProgramData(programData);
    const securityTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/security` });
    // TODO: fetch pmp canonical security
    const { url, cluster } = useCluster();
    const { programMetadataSecurityTxt } = useProgramMetadataSecurityTxt(pubkey.toBase58(), url, cluster);

    const error = (securityTXT || programMetadataSecurityTxt) ? undefined : NO_SECURITY_TXT_ERROR;
    
    return <SecurityTXTBadge error={error} tabPath={securityTabPath} />;
}

export function SecurityTXTBadge({ error, tabPath }: { error?: string; tabPath: string }) {
    if (error) {
        return (
            <h3 className="mb-0">
                <span className="badge bg-warning-soft rank">{error}</span>
            </h3>
        );
    }

    return (
        <h3 className="mb-0">
            <Link className="c-pointer badge bg-success-soft rank" href={tabPath}>
                Included
            </Link>
        </h3>
    );
}
