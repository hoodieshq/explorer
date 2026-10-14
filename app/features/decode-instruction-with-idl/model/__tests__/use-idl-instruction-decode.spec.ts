import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIdlInstructionDecode } from '../use-idl-instruction-decode';

// Mock the resolution boundaries + the decode helper so the test pins the hook's own job — IDL precedence,
// argument forwarding, and gating — not the SWR/decode machinery (each tested in its own slice). The
// panic→Unknown degrade is `safeDecodeInstructionWithIdl`'s responsibility and is tested with the lib.
const idlState = { anchorIdl: undefined as unknown, isCustomIdl: false, programMetadataIdl: undefined as unknown };
const safeDecodeInstructionWithIdl = vi.fn();

vi.mock('@providers/cluster', () => ({ useCluster: () => ({ cluster: 'devnet', url: 'http://localhost' }) }));
vi.mock('@entities/idl', () => ({ useProgramIdls: () => idlState }));
vi.mock('../../lib/decode-instruction-with-idl', () => ({
    safeDecodeInstructionWithIdl: (...a: unknown[]) => safeDecodeInstructionWithIdl(...a),
}));

const raw = new TransactionInstruction({ data: Buffer.from([1, 2, 3]), keys: [], programId: PublicKey.unique() });
const programId = raw.programId.toString();
const anchorIdl = { kind: 'anchor' };
const pmpIdl = { kind: 'pmp' };

describe('useIdlInstructionDecode', () => {
    beforeEach(() => {
        safeDecodeInstructionWithIdl.mockReset();
        idlState.anchorIdl = undefined;
        idlState.programMetadataIdl = undefined;
        idlState.isCustomIdl = false;
    });

    it('should prefer the PMP IDL over the legacy Anchor IDL', () => {
        idlState.anchorIdl = anchorIdl;
        idlState.programMetadataIdl = pmpIdl;
        safeDecodeInstructionWithIdl.mockReturnValue({ kind: 'codama' });

        renderHook(() => useIdlInstructionDecode({ programId, raw }));

        expect(safeDecodeInstructionWithIdl).toHaveBeenCalledWith(raw, pmpIdl, 'http://localhost');
    });

    it('should fall back to the Anchor IDL when no PMP IDL is published', () => {
        idlState.anchorIdl = anchorIdl;
        safeDecodeInstructionWithIdl.mockReturnValue({ kind: 'anchor' });

        const { result } = renderHook(() => useIdlInstructionDecode({ programId, raw }));

        expect(safeDecodeInstructionWithIdl).toHaveBeenCalledWith(raw, anchorIdl, 'http://localhost');
        expect(result.current).toEqual({ isCustomIdl: false, kind: 'anchor' });
    });

    it('should mark a decode made with the custom IDL', () => {
        idlState.anchorIdl = anchorIdl;
        idlState.isCustomIdl = true;
        safeDecodeInstructionWithIdl.mockReturnValue({ kind: 'unknown' });

        const { result } = renderHook(() => useIdlInstructionDecode({ programId, raw }));

        expect(result.current).toEqual({ isCustomIdl: true, kind: 'unknown' });
    });

    it('should return undefined and not decode when the program has no IDL', () => {
        const { result } = renderHook(() => useIdlInstructionDecode({ programId, raw }));

        expect(result.current).toBeUndefined();
        expect(safeDecodeInstructionWithIdl).not.toHaveBeenCalled();
    });

    it('should return undefined and not decode when there is no raw instruction (pre-parsed)', () => {
        idlState.anchorIdl = anchorIdl;

        const { result } = renderHook(() => useIdlInstructionDecode({ programId, raw: undefined }));

        expect(result.current).toBeUndefined();
        expect(safeDecodeInstructionWithIdl).not.toHaveBeenCalled();
    });
});
