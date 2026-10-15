import { PublicKey } from '@solana/web3.js';
import { render, screen, within } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import type { InstructionLogs } from '@utils/program-logs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: () => '/tx/inspector',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@entities/idl', async importOriginal => ({
    ...(await importOriginal<typeof import('@entities/idl')>()),
    useAnchorProgram: () => ({ idl: null, isLoading: false, program: null }),
}));

import { BaseProgramLogsCardBody, type ProgramLogsInstruction } from '../BaseProgramLogsCardBody';

const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const LOOKUP_TABLE_PROGRAM = new PublicKey('AddressLookupTab1e1111111111111111111111111');

describe('BaseProgramLogsCardBody', () => {
    it('should pair each instruction with the logs of the program it invoked', () => {
        renderCard([{ programId: SYSTEM_PROGRAM }, { programId: TOKEN_PROGRAM }], [logsOf(TOKEN_PROGRAM, 'token ran')]);

        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).queryByText('token ran')).not.toBeInTheDocument();
        expect(within(rows[1]).getByText('token ran')).toBeInTheDocument();
    });

    it('should give a native program that logs no invoke line the entry it produced', () => {
        renderCard(
            [{ programId: LOOKUP_TABLE_PROGRAM }, { programId: SYSTEM_PROGRAM }],
            [logsOf(null, 'table extended'), logsOf(SYSTEM_PROGRAM, 'system ran')],
        );

        const rows = screen.getAllByRole('row');
        expect(within(rows[0]).getByText('table extended')).toBeInTheDocument();
        expect(within(rows[1]).getByText('system ran')).toBeInTheDocument();
    });
});

function logsOf(program: PublicKey | null, text: string): InstructionLogs {
    return {
        computeUnits: 0,
        failed: false,
        invokedProgram: program?.toBase58() ?? null,
        logs: [{ prefix: '> ', style: 'muted', text }],
        truncated: false,
    };
}

function renderCard(instructions: ProgramLogsInstruction[], logs: InstructionLogs[]) {
    return render(
        <BaseProgramLogsCardBody
            instructions={instructions}
            logs={logs}
            cluster={Cluster.MainnetBeta}
            url="https://api.mainnet-beta.solana.com"
        />,
    );
}
