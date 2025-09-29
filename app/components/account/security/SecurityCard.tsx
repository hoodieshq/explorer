import { ErrorCard } from '@components/common/ErrorCard';
import { UpgradeableLoaderAccountData } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import { fromProgramData, NeodymeSecurityTXT, NO_SECURITY_TXT_ERROR } from '@utils/security-txt';
import { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useCluster } from '@/app/providers/cluster';
import { useProgramMetadataSecurityTxt } from '@/app/providers/program-metadata/useProgramMetadataSecurityTxt';

import { DownloadableButton } from '../../common/Downloadable';
import { SecurityTxtVersionBadge } from './common';
import { NeodymeSecurityTxtTable } from './NeodymeSecurityTxtTable';
import { PmpSecurityTxtTable } from './PmpSecurityTxtTable';

export function SecurityCard({ data, pubkey }: { data: UpgradeableLoaderAccountData; pubkey: PublicKey }) {
    const { url, cluster } = useCluster();
    const { programMetadataSecurityTxt } = useProgramMetadataSecurityTxt(pubkey.toBase58(), url, cluster);

    if (!data.programData) {
        return <ErrorCard text="Account has no data" />;
    }

    const { securityTXT, error } = fromProgramData(data.programData);
    if (!securityTXT && !programMetadataSecurityTxt && error) {
        return <ErrorCard text={error} />;
    }
    return (
        <ProgramSecurityTxtCard
            programAddress={pubkey.toBase58()}
            programDataSecurityTxt={securityTXT}
            pmpSecurityTxt={programMetadataSecurityTxt}
        />
    );
}

// Accepts security.txt from Program Data and Program Metadata json
// By default renders security.txt json from Program Metadata
// Fallback to Program Data security.txt
export function ProgramSecurityTxtCard({ programAddress, programDataSecurityTxt, pmpSecurityTxt }: { programAddress: string; programDataSecurityTxt: NeodymeSecurityTXT | undefined; pmpSecurityTxt: any }) {
    const downloadData = useMemo(() => {
        if (!pmpSecurityTxt && !programDataSecurityTxt) return "";
        return Buffer.from(JSON.stringify(pmpSecurityTxt || programDataSecurityTxt, null, 2)).toString('base64');
    }, [programDataSecurityTxt, pmpSecurityTxt]);

    if (!programDataSecurityTxt && !pmpSecurityTxt) {
        return <ErrorCard text={NO_SECURITY_TXT_ERROR} />;
    }

    return (
        <div className="card security-txt">
            <div className="card-header e-flex-col md:e-flex-row e-items-start md:e-items-center e-h-auto e-min-h-[60px]">
                <h3 className="card-header-title mb-0 d-flex align-items-center gap-3 e-mr-4">
                    Security.txt
                    <SecurityTxtVersionBadge
                        version={pmpSecurityTxt ? "pmp" : "neodyme"}
                    />
                    <div className="d-flex btn btn-sm btn-primary">
                        <DownloadableButton
                            data={downloadData}
                            filename={`${programAddress}-security-txt.json`}
                            type="application/json"
                        >
                            Download
                        </DownloadableButton>
                    </div>
                </h3>
                <small>Note that this is self-reported by the author of the program and might not be accurate.</small>
            </div>
            <ErrorBoundary fallback={<div className='card-body text-center'>Invalid security.txt</div>}>
                {pmpSecurityTxt ? (
                    <PmpSecurityTxtTable data={pmpSecurityTxt!} />
                ) : (
                    Boolean(programDataSecurityTxt) && <NeodymeSecurityTxtTable data={programDataSecurityTxt!} />
                )}
            </ErrorBoundary>
        </div>
    );
}