import { gen } from '@__fixtures__/gen';
import { getBase58Decoder } from '@solana/kit';
import { type ParsedMessage, PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getAnchorNameForInstruction } = vi.hoisted(() => ({
    getAnchorNameForInstruction: vi.fn<(data: Uint8Array) => string | null>(),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/tx/signature',
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

import { Web3JsProgramLogsCardBody } from '../Web3JsProgramLogsCardBody';

const FEE_PAYER = gen.publicKey(1);
const ACCOUNT = gen.publicKey(2);
const PROGRAM = gen.publicKey(3);
const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');

afterEach(() => vi.clearAllMocks());

describe('Web3JsProgramLogsCardBody', () => {
    it('should hand the Anchor decoder the base58-decoded data of a partially decoded instruction', () => {
        getAnchorNameForInstruction.mockReturnValue('swapExactIn');
        const data = getBase58Decoder().decode(new Uint8Array([7, 8, 9]));

        renderCard([{ accounts: [FEE_PAYER, ACCOUNT], data, programId: PROGRAM }]);

        expect(screen.getByText('Swapper Swap Exact In')).toBeInTheDocument();
        expect(getAnchorNameForInstruction).toHaveBeenCalledWith(new Uint8Array([7, 8, 9]), expect.anything());
    });

    it('should not decode the already parsed instruction', () => {
        renderCard([{ parsed: { info: {}, type: 'transfer' }, program: 'system', programId: SYSTEM_PROGRAM }]);

        expect(getAnchorNameForInstruction).not.toHaveBeenCalled();
        expect(screen.getByText('System Instruction')).toBeInTheDocument();
    });
});

function renderCard(instructions: ParsedMessage['instructions']) {
    const message: ParsedMessage = {
        accountKeys: [
            { pubkey: FEE_PAYER, signer: true, source: 'transaction', writable: true },
            { pubkey: ACCOUNT, signer: false, source: 'transaction', writable: false },
        ],
        instructions,
        recentBlockhash: gen.blockhash(),
    };

    return render(
        <Web3JsProgramLogsCardBody
            message={message}
            logs={[]}
            cluster={Cluster.MainnetBeta}
            url="https://api.mainnet-beta.solana.com"
        />,
    );
}
