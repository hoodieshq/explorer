import { isRetryableError } from '@shared/lib/errors';
import { address, createSolanaRpc } from '@solana/kit';
import { type BackoffOptions, withBackoff } from '@utils/with-backoff';

import { buildProgramIdlNames, type ProgramIdlNames } from '../model/instruction-name-table';
import { NON_ANCHOR_PROGRAMS } from './config';
import { resolveProgramIdls } from './resolve-program-idls';
import { type ProgramIdlPair } from './types';

/**
 * A program's IDL-derived names - its display name and its instruction-name resolver - or undefined when no
 * IDL names it.
 *
 * Undefined covers three cases a caller has no reason to tell apart: a builtin, a program with no IDL, and a
 * program whose IDLs carry neither a metadata name nor a usable discriminator table.
 *
 * Throws only on RPC failure, matching `resolveProgramIdls`.
 * @param url - The RPC URL to resolve against
 * @param programId - The program whose IDLs to read
 * @param backoffOptions - Retry configuration for handling RPC failures.
 */
export async function resolveProgramIdlNames(
    url: string,
    programId: string,
    backoffOptions: BackoffOptions,
): Promise<ProgramIdlNames | undefined> {
    // Never ask for a builtin's IDL, the rule `useProgramIdlNames` applies at :30. `resolveProgramIdls`
    // skips only the Anchor leg for these, so returning here also saves the PMP call the hook never makes.
    if (NON_ANCHOR_PROGRAMS.has(programId)) return undefined;

    // A fresh client per attempt is the fix, not the retry itself: a large IDL occasionally premature-closes
    // the response body. `shouldRetry` is defaulted rather than pinned - gating on transient RPC errors is
    // what makes "throws only on RPC failure" true, but a caller with a better classifier may say so.
    // Narrowed as `resolveProgramIdlsClient` does: detecting the IDL standard is `buildProgramIdlNames`' job.
    const idls = (await withBackoff(() => resolveProgramIdls(createSolanaRpc(url), address(programId)), {
        shouldRetry: isRetryableError,
        ...backoffOptions,
    })) as ProgramIdlPair;

    // Program-metadata beats Anchor, the order `useProgramIdlNames` uses at :72.
    return buildProgramIdlNames([idls.programMetadataIdl, idls.anchorIdl]);
}
