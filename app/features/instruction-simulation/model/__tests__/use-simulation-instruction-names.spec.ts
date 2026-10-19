// @vitest-environment jsdom

import { gen } from '@__fixtures__/gen';
import { createV0MessageBytes } from '@__fixtures__/transaction-message';
import { fromMessageBytes } from '@explorer/parsers/transaction';
import { address, type Instruction } from '@solana/kit';
import { renderHook } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useProgramIdlNames } = vi.hoisted(() => ({ useProgramIdlNames: vi.fn() }));
vi.mock('@entities/idl/@x/transaction-data', () => ({ useProgramIdlNames }));
vi.mock('@providers/cluster', () => ({ useCluster: () => ({ cluster: Cluster.MainnetBeta, url: MAINNET_URL }) }));

import { useSimulationInstructionNames } from '../use-simulation-instruction-names';

const MAINNET_URL = 'https://api.mainnet-beta.solana.com';
const FEE_PAYER = address(gen.address(1));
const TOKEN_PROGRAM = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const COMPUTE_BUDGET_PROGRAM = address('ComputeBudget111111111111111111111111111111');
const JUPITER_PROGRAM = address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');

const TRANSFER_CHECKED = new Uint8Array([12, 0, 0, 0, 0, 0, 0, 0, 0, 6]);
const JUPITER_ROUTE = new Uint8Array([229, 23, 203, 151, 122, 227, 173, 42]);
const SET_CU_PRICE = new Uint8Array([3, 0x90, 0x06, 0, 0, 0, 0, 0, 0]);

const JUPITER_IDL_NAMES = new Map([
    [JUPITER_PROGRAM, { programName: 'Jupiter', resolveInstructionName: () => 'Route V2' }],
]);

beforeEach(() => useProgramIdlNames.mockReturnValue(new Map()));
afterEach(() => vi.clearAllMocks());

describe('useSimulationInstructionNames', () => {
    it('should produce no rows before the simulation runs', () => {
        const { result } = renderHook(() => useSimulationInstructionNames(undefined));

        expect(result.current).toEqual([]);
    });

    it('should name a Token instruction from its discriminator', () => {
        const { result } = renderNames([{ data: TRANSFER_CHECKED, programAddress: TOKEN_PROGRAM }]);

        expect(result.current[0]).toMatchObject({ name: 'Transfer Checked', programName: 'Token Program' });
    });

    it('should name a Compute Budget instruction', () => {
        const { result } = renderNames([{ data: SET_CU_PRICE, programAddress: COMPUTE_BUDGET_PROGRAM }]);

        expect(result.current[0]).toMatchObject({
            name: 'Set Compute Unit Price',
            programName: 'Compute Budget Program',
        });
    });

    it('should apply an IDL name once the fetch lands', () => {
        useProgramIdlNames.mockReturnValue(JUPITER_IDL_NAMES);

        const { result } = renderNames([{ data: JUPITER_ROUTE, programAddress: JUPITER_PROGRAM }]);

        expect(result.current[0]).toMatchObject({ name: 'Route V2', programName: 'Jupiter' });
    });

    it('should leave the name unset while the IDL fetch is in flight', () => {
        const { result } = renderNames([{ data: JUPITER_ROUTE, programAddress: JUPITER_PROGRAM }]);

        expect(result.current[0].name).toBeUndefined();
    });

    it('should look up every program, leaving the fetch filter to the IDL hook', () => {
        renderNames([
            { data: SET_CU_PRICE, programAddress: COMPUTE_BUDGET_PROGRAM },
            { data: JUPITER_ROUTE, programAddress: JUPITER_PROGRAM },
            { data: TRANSFER_CHECKED, programAddress: TOKEN_PROGRAM },
        ]);

        expect(useProgramIdlNames).toHaveBeenCalledWith(
            [COMPUTE_BUDGET_PROGRAM, JUPITER_PROGRAM, TOKEN_PROGRAM],
            Cluster.MainnetBeta,
            MAINNET_URL,
        );
    });

    it('should fill in names across a rerender without disturbing row order', () => {
        const { result, rerender } = renderNames([
            { data: TRANSFER_CHECKED, programAddress: TOKEN_PROGRAM },
            { data: JUPITER_ROUTE, programAddress: JUPITER_PROGRAM },
        ]);

        expect(result.current.map(row => row.name)).toEqual(['Transfer Checked', undefined]);

        useProgramIdlNames.mockReturnValue(JUPITER_IDL_NAMES);
        rerender();

        expect(result.current.map(row => row.name)).toEqual(['Transfer Checked', 'Route V2']);
        expect(result.current.map(row => row.programId)).toEqual([TOKEN_PROGRAM, JUPITER_PROGRAM]);
    });

    it('should not carry the lookup through to a resolved row', () => {
        useProgramIdlNames.mockReturnValue(JUPITER_IDL_NAMES);

        const { result } = renderNames([{ data: JUPITER_ROUTE, programAddress: JUPITER_PROGRAM }]);

        expect(result.current[0]).not.toHaveProperty('nameLookup');
    });
});

function renderNames(instructions: Instruction[]) {
    const transaction = fromMessageBytes(createV0MessageBytes(FEE_PAYER, instructions));

    return renderHook(() => useSimulationInstructionNames(transaction));
}
