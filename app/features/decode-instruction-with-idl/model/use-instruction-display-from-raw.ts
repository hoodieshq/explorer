import 'client-only';

import { getInstructionDisplay, type InstructionDisplay } from '@codama/dynamic-instructions';
import { useCluster, useSolanaRpc } from '@entities/cluster';
import { type CodamaIdl, createFetchDisplayAccount, hasDisplayMetadata } from '@entities/idl';
import { useProgramMetadataIdl } from '@entities/program-metadata';
import type { TransactionInstruction } from '@solana/web3.js';
import { useEffect, useRef, useState } from 'react';

import { toKitInstruction } from '@/app/shared/lib/web3js-compat';

export function useInstructionDisplayFromRaw({
    enabled,
    programId,
    raw,
}: {
    raw: TransactionInstruction | undefined;
    programId: string;
    enabled: boolean;
}): { display: InstructionDisplay | undefined; isLoading: boolean; hasDisplay: boolean } {
    const { cluster, url } = useCluster();
    const rpc = useSolanaRpc();
    const { programMetadataIdl } = useProgramMetadataIdl(programId, url, cluster);
    const [display, setDisplay] = useState<InstructionDisplay>();
    const [isLoading, setIsLoading] = useState(false);
    const runIdRef = useRef(0);

    const hasDisplay = hasDisplayMetadata(programMetadataIdl);

    useEffect(() => {
        const runId = ++runIdRef.current;

        if (!enabled || !hasDisplay || !raw) {
            setDisplay(undefined);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        void (async () => {
            try {
                const next = await getInstructionDisplay(programMetadataIdl as CodamaIdl, toKitInstruction(raw), {
                    // One memo per computation: the display layer re-reads the same account up to six times.
                    fetchAccount: createFetchDisplayAccount(rpc),
                });

                // The library reports "not identified" as null, while absence travels as undefined here.
                if (runIdRef.current === runId) setDisplay(next ?? undefined);
            } catch {
                if (runIdRef.current === runId) setDisplay(undefined);
            } finally {
                if (runIdRef.current === runId) setIsLoading(false);
            }
        })();
    }, [enabled, hasDisplay, programMetadataIdl, raw, rpc]);

    return { display, hasDisplay, isLoading };
}
