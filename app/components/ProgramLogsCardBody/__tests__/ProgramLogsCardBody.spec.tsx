import { gen } from '@__fixtures__/gen';
import { createV0MessageBytes } from '@__fixtures__/transaction-message';
import { fromMessageBytes } from '@explorer/parsers/transaction';
import { address } from '@solana/kit';
import { render, screen } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { describe, expect, it, vi } from 'vitest';

const { getAnchorNameForInstruction } = vi.hoisted(() => ({
    getAnchorNameForInstruction: vi.fn<(data: Uint8Array) => string | null>(),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/tx/inspector',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@entities/idl', async importOriginal => ({
    ...(await importOriginal<typeof import('@entities/idl')>()),
    useAnchorProgram: () => ({ idl: null, isLoading: false, program: {} }),
}));
vi.mock('@utils/anchor', async importOriginal => ({
    ...(await importOriginal<typeof import('@utils/anchor')>()),
    getAnchorNameForInstruction,
    getAnchorProgramName: () => 'Swapper',
}));

import { ProgramLogsCardBody } from '../ProgramLogsCardBody';

const FEE_PAYER = address(gen.address(1));
const PROGRAM = address(gen.address(2));

describe('ProgramLogsCardBody', () => {
    it('should hand the Anchor decoder the data of an instruction', () => {
        getAnchorNameForInstruction.mockReturnValue('swapExactIn');
        const transaction = fromMessageBytes(
            createV0MessageBytes(FEE_PAYER, { data: new Uint8Array([7]), programAddress: PROGRAM }),
        );

        render(
            <ProgramLogsCardBody
                transaction={transaction}
                logs={[]}
                cluster={Cluster.MainnetBeta}
                url="https://api.mainnet-beta.solana.com"
            />,
        );

        expect(screen.getByText('Swapper Swap Exact In')).toBeInTheDocument();
        expect(getAnchorNameForInstruction).toHaveBeenCalledWith(new Uint8Array([7]), expect.anything());
    });
});
