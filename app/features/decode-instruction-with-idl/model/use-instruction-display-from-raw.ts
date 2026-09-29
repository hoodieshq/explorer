import 'client-only';

import { getInstructionDisplay, type InstructionDisplay } from '@codama/dynamic-instructions';
import { useCluster, useSolanaRpc } from '@entities/cluster';
import { type CodamaIdl, createFetchDisplayAccount, hasDisplayMetadata } from '@entities/idl';
import { useProgramMetadataIdl } from '@entities/program-metadata';
import type { TransactionInstruction } from '@solana/web3.js';
import useSWR from 'swr';

import { toKitInstruction } from '@/app/shared/lib/web3js-compat';

/** What one intent computation settled on. */
export type InstructionDisplayResult = {
    /** Undefined when the IDL publishes intents but cannot identify this particular instruction. */
    display: InstructionDisplay | undefined;
    /** The display read live account state (e.g. mint decimals), which can differ from the transaction's slot. */
    usedAccountData: boolean;
};

export type InstructionDisplayState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; retry: () => void }
    | ({ status: 'resolved' } & InstructionDisplayResult);

const SWR_OPTIONS = {
    // A finished instruction does not change, so a result is kept for the page's lifetime: reopening the
    // intent, or opening it again through "Show all intents", costs nothing.
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
};

/**
 * The sRFC 39 display for one wire instruction, resolved on demand.
 * `hasDisplay` is known as soon as the program's IDL arrives, so callers can decide whether to offer the
 * affordance at all before anything is computed; nothing is fetched until `enabled`.
 */
export function useInstructionDisplayFromRaw({
    enabled,
    programId,
    raw,
}: {
    raw: TransactionInstruction | undefined;
    programId: string;
    enabled: boolean;
}): { hasDisplay: boolean; isIdlLoading: boolean; state: InstructionDisplayState } {
    const { cluster, url } = useCluster();
    const rpc = useSolanaRpc();
    const { programMetadataIdl, isLoading: isIdlLoading } = useProgramMetadataIdl(programId, url, cluster);

    const hasDisplay = hasDisplayMetadata(programMetadataIdl);
    // eslint-disable-next-line unicorn/no-null -- SWR's contract for "do not fetch" is a null key
    const key = enabled && hasDisplay && raw ? instructionDisplayKey({ cluster, raw, url }) : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        async (): Promise<InstructionDisplayResult> => {
            // One memo per computation: the display layer re-reads the same account up to six times.
            const fetchAccount = createFetchDisplayAccount(rpc);
            let usedAccountData = false;

            // `raw` and the IDL are non-null here: the key is null otherwise, and SWR skips the fetch.
            const display = await getInstructionDisplay(
                programMetadataIdl as CodamaIdl,
                toKitInstruction(raw as TransactionInstruction),
                {
                    fetchAccount: address => {
                        usedAccountData = true;
                        return fetchAccount(address);
                    },
                },
            );

            // The library reports "not identified" as null, while absence travels as undefined here.
            return { display: display ?? undefined, usedAccountData };
        },
        SWR_OPTIONS,
    );

    return {
        hasDisplay,
        isIdlLoading,
        state: toState({ data, error, isLoading, key, retry: () => void mutate() }),
    };
}

function toState({
    key,
    data,
    error,
    isLoading,
    retry,
}: {
    key: unknown;
    data: InstructionDisplayResult | undefined;
    error: unknown;
    isLoading: boolean;
    retry: () => void;
}): InstructionDisplayState {
    if (key === null) return { status: 'idle' };
    if (error) return { retry, status: 'error' };
    if (isLoading || !data) return { status: 'loading' };
    return { status: 'resolved', ...data };
}

// Keyed by content, not identity: the transaction page and the inspector rebuild instruction objects on
// every render, and the same bytes against the same cluster always resolve to the same display.
function instructionDisplayKey({ cluster, url, raw }: { cluster: unknown; url: string; raw: TransactionInstruction }) {
    return [
        'instruction-display',
        cluster,
        url,
        raw.programId.toBase58(),
        raw.keys.map(meta => meta.pubkey.toBase58()).join(','),
        raw.data.toString('hex'),
    ] as const;
}
