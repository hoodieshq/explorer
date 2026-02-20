import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { decodeAttestation, SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS as SAS_PROGRAM_ID } from 'sas-lib';
import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

import { TOKEN_VERIFICATION_SWR_CONFIG } from './token-verification-cache';

export enum BlupryntStatus {
    Success,
    FetchFailed,
    Loading,
    NotFound,
}

export type BlupryntResult = {
    verified: boolean;
    status: BlupryntStatus;
};

const BLUPRYNT_CREDENTIAL = 'FygHgyQWuSHP9ob7Bt64gGrzRsuuxUbnAiKKeZDtCKeQ';

type BlupryntSwrKey = ['bluprynt-verification', string, string];

function getBlupryntSwrKey(cluster: Cluster, rpcUrl: string, mintAddress?: string): BlupryntSwrKey | null {
    if (!mintAddress || cluster !== Cluster.MainnetBeta) {
        return null;
    }

    return ['bluprynt-verification', mintAddress, rpcUrl];
}

async function fetchBlupryntVerification([, mintAddress, rpcUrl]: BlupryntSwrKey): Promise<BlupryntResult> {
    try {
        const connection = new Connection(rpcUrl);
        const accounts = await connection.getProgramAccounts(new PublicKey(SAS_PROGRAM_ID), {
            filters: [{ memcmp: { bytes: BLUPRYNT_CREDENTIAL, offset: 33 } }],
        });

        const verified = accounts.some(account => {
            try {
                const decoded = decodeAttestation({
                    address: account.pubkey.toBase58(),
                    data: Uint8Array.from(account.account.data),
                } as any);
                const att = (decoded as any).data;

                if (att.nonce === mintAddress || att.signer === mintAddress || att.tokenAccount === mintAddress) {
                    return true;
                }

                if (att.data?.length >= 32 && bs58.encode(att.data.slice(0, 32)) === mintAddress) {
                    return true;
                }

                return false;
            } catch {
                return false;
            }
        });

        return {
            status: verified ? BlupryntStatus.Success : BlupryntStatus.NotFound,
            verified,
        };
    } catch {
        return { status: BlupryntStatus.FetchFailed, verified: false };
    }
}

export function useBlupryntVerification(mintAddress?: string): BlupryntResult | undefined {
    const { cluster, url } = useCluster();
    const swrKey = getBlupryntSwrKey(cluster, url, mintAddress);
    const { data, isLoading } = useSWR(swrKey, fetchBlupryntVerification, TOKEN_VERIFICATION_SWR_CONFIG);

    if (isLoading && !data) {
        return { status: BlupryntStatus.Loading, verified: false };
    }

    return data || { status: BlupryntStatus.FetchFailed, verified: false };
}
