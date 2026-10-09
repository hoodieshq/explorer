import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdlDecodeFailureNotice } from '../IdlDecodeFailureNotice';

const PMP_IDL = { name: 'pmp' };
const ANCHOR_IDL = { name: 'anchor' };
const CUSTOM_IDL = { name: 'custom' };

const state = vi.hoisted(() => ({
    decodes: new Set<unknown>(),
    isCustomIdl: false,
    onChainIdls: {} as Record<string, unknown>,
    preference: undefined as unknown,
    selectIdlSource: vi.fn(),
}));

vi.mock('@providers/cluster', () => ({ useCluster: () => ({ cluster: 'devnet', url: 'http://localhost' }) }));
vi.mock('@entities/idl', async importOriginal => ({
    ...(await importOriginal<typeof import('@entities/idl')>()),
    CustomIdlUploadDialog: () => undefined,
    useProgramIdlPreference: () => ({
        addCustomIdl: vi.fn(),
        preference: state.preference,
        selectIdlSource: state.selectIdlSource,
    }),
    useProgramIdls: () => ({ isCustomIdl: state.isCustomIdl, onChainIdls: state.onChainIdls }),
}));
// Each test names the IDLs that decode the instruction; the decoder itself is tested with the lib.
vi.mock('../../lib/decode-instruction-with-idl', () => ({
    isIdlInstructionDecoded: (decode: { kind: string }) => decode.kind === 'codama',
    safeDecodeInstructionWithIdl: (_ix: unknown, idl: unknown) => ({
        kind: state.decodes.has(idl) ? 'codama' : 'unknown',
    }),
}));

const ix = new TransactionInstruction({ data: Buffer.from([1]), keys: [], programId: PublicKey.unique() });

describe('IdlDecodeFailureNotice', () => {
    beforeEach(() => {
        state.decodes = new Set();
        state.isCustomIdl = false;
        state.onChainIdls = { anchorIdl: ANCHOR_IDL, programMetadataIdl: PMP_IDL };
        state.preference = undefined;
        state.selectIdlSource.mockReset();
    });

    it('should offer the on-chain IDL that decodes the instruction', () => {
        state.decodes.add(ANCHOR_IDL);
        render(<IdlDecodeFailureNotice ix={ix} />);

        expect(screen.getByRole('status')).toHaveTextContent('The PMP IDL could not decode this instruction.');
        fireEvent.click(screen.getByRole('button', { name: 'Anchor (on-chain)' }));
        expect(state.selectIdlSource).toHaveBeenCalledWith('anchor');
    });

    it('should offer the stored custom IDL when it decodes and the on-chain one does not', () => {
        state.isCustomIdl = false;
        state.preference = { custom: { addedAt: 1, idl: CUSTOM_IDL } };
        state.decodes.add(CUSTOM_IDL);
        render(<IdlDecodeFailureNotice ix={ix} />);

        fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
        expect(state.selectIdlSource).toHaveBeenCalledWith('custom');
    });

    it('should offer an upload when no IDL decodes the instruction', () => {
        state.onChainIdls = {};
        render(<IdlDecodeFailureNotice ix={ix} />);

        expect(screen.getByRole('status')).toHaveTextContent('No IDL decodes this instruction.');
        expect(screen.getByRole('button', { name: 'Add custom IDL…' })).toBeInTheDocument();
    });

    it('should offer a replacement when the selected custom IDL is the only one and fails', () => {
        state.onChainIdls = {};
        state.isCustomIdl = true;
        state.preference = { custom: { addedAt: 1, idl: CUSTOM_IDL }, selected: 'custom' };
        render(<IdlDecodeFailureNotice ix={ix} />);

        expect(screen.getByRole('status')).toHaveTextContent('The Custom IDL could not decode this instruction.');
        expect(screen.getByRole('button', { name: 'Replace custom IDL…' })).toBeInTheDocument();
    });
});
