import type { TransactionInstruction } from '@solana/web3.js';

import { PMP_ADDRESS } from './constants';

/**
 * Whether an instruction targets the Program Metadata Program. Mirrors the per-program guards it sits alongside
 * (`isLighthouseInstruction`, `isPythInstruction`, ...) and is used by both the tx page and the inspector.
 */
export function isProgramMetadataInstruction(ix: TransactionInstruction): boolean {
    return ix.programId.toBase58() === PMP_ADDRESS;
}
