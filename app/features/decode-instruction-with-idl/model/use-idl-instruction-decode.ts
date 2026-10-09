import { useProgramIdls } from '@entities/idl';
import { useCluster } from '@providers/cluster';
import { TransactionInstruction } from '@solana/web3.js';
import { useMemo } from 'react';

import { type IdlInstructionDecode, safeDecodeInstructionWithIdl } from '../lib/decode-instruction-with-idl';

/** A decode plus whether it came from the user's custom IDL, which the card highlights. */
export type ProgramIdlInstructionDecode = IdlInstructionDecode & { isCustomIdl: boolean };

/**
 * The dynamic decode tier shared by the tx page and the inspector: resolve a program's IDL (PMP-published
 * preferred over the legacy Anchor IDL) and decode `raw` against it. Returns undefined when the program has
 * no IDL, or there's no raw instruction to decode (RPC-pre-parsed) — the caller then falls through to its
 * remaining tiers. The decode is memoized so the Anchor Program / Borsh coder isn't rebuilt on every
 * re-render. The precedence and the panic→Unknown degrade (in `safeDecodeInstructionWithIdl`) live here so
 * the two surfaces can't drift. A selected custom IDL replaces both on-chain IDLs here (see `useProgramIdls`),
 * so its failure stays a failure instead of falling back to the chain.
 */
export function useIdlInstructionDecode({
    programId,
    raw,
}: {
    programId: string;
    raw: TransactionInstruction | undefined;
}): ProgramIdlInstructionDecode | undefined {
    const { cluster, url } = useCluster();
    const { anchorIdl, programMetadataIdl, isCustomIdl } = useProgramIdls(programId, url, cluster);

    const idl = programMetadataIdl ?? anchorIdl;
    return useMemo(
        () => (idl && raw ? { ...safeDecodeInstructionWithIdl(raw, idl, url), isCustomIdl } : undefined),
        [idl, raw, url, isCustomIdl],
    );
}
