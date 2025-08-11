import { fetch } from 'cross-fetch';
import { fetchMetadataFromSeeds, unpackAndFetchData } from '@solana-program/program-metadata';
import { address, createSolanaRpc, mainnet } from 'web3js-experimental';
import { Cluster } from '@/app/utils/cluster';
import { RootNode } from 'codama';

const PMP_IDL_ENABLED = process.env.NEXT_PUBLIC_PMP_IDL_ENABLED === 'true';

export async function getProgramMetadataIdl(programAddress: string, url: string) {
    const rpc = createSolanaRpc(mainnet(url));
    let metadata;

    try {
        // @ts-expect-error RPC types mismatch
        metadata = await fetchMetadataFromSeeds(rpc, {
            authority: null,
            program: address(programAddress),
            seed: 'idl',
        });
    } catch (error) {
        console.error('Metadata fetch failed', error);
        throw new Error('Metadata fetch failed');
    }
    try {
        // @ts-expect-error RPC types mismatch
        const content = await unpackAndFetchData({ rpc, ...metadata.data });
        const parsed = JSON.parse(content);
        return parsed;
    } catch (error) {
        throw new Error('JSON parse failed');
    }
}

/**
 * Core fetcher: returns the Codama IDL (or null)
 */
export async function fetchProgramMetadataIdl(
  programAddress: string,
  url: string,
  cluster: Cluster
): Promise<any> {
    if (!PMP_IDL_ENABLED) {
        return null;
    }

    try {
        const response = await fetch(
            `/api/programMetadataIdl?programAddress=${programAddress}&cluster=${cluster}`
        );
        if (response.ok) {
            const data = await response.json();
            return data.codamaIdl || null;
        }
        // Only attempt to fetch client side if the url is localhost or 127.0.0.1
        if (new URL(url).hostname === 'localhost' || new URL(url).hostname === '127.0.0.1') {
            return getProgramMetadataIdl(programAddress, url);
        }
        return null;
    } catch (error) {
        console.error('Error fetching codama idl', error);
        return null;
    }
}

export function programNameFromIdl(idl: RootNode) {
    return idl.program.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
