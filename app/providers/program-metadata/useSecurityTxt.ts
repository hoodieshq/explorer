import { useCluster } from '@/app/providers/cluster';
import { fromProgramData, type NeodymeSecurityTXT, type PmpSecurityTXT } from '@/app/utils/security-txt';
import type { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';

import { useProgramMetadataSecurityTxt } from './useProgramMetadataSecurityTxt';

export function useSecurityTxt(
    address: string,
    parsedData: { programData?: ProgramDataAccountInfo }
): NeodymeSecurityTXT | PmpSecurityTXT | undefined {
    const { url, cluster } = useCluster();

    let securityTXT: NeodymeSecurityTXT | PmpSecurityTXT | undefined;

    const { programMetadataSecurityTxt } = useProgramMetadataSecurityTxt(address, url, cluster);

    if (programMetadataSecurityTxt) {
        securityTXT = programMetadataSecurityTxt;
    }

    if (!securityTXT && parsedData.programData) {
        const { securityTXT: programDataSecurityTxt } = fromProgramData(parsedData.programData);
        securityTXT = programDataSecurityTxt;
    }

    return securityTXT;
}
