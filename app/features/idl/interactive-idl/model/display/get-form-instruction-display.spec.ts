import { readFileSync } from 'node:fs';
import path from 'node:path';

import { gen } from '@__fixtures__/gen';
import { createProgramClient } from '@codama/dynamic-client';
import { PublicKey } from '@solana/web3.js';
import type { RootNode } from 'codama';
import { describe, expect, it } from 'vitest';

import { CodamaUnifiedProgram } from '../codama/codama-program';
import type { BaseIdl, UnifiedProgram } from '../unified-program.d';
import type { InstructionFormData } from '../use-instruction-form';
import { getFormInstructionDisplay } from './get-form-instruction-display';

function loadIdl(filename: string): RootNode {
    const idlPath = path.resolve(__dirname, '../__mocks__/codama', filename);
    return JSON.parse(readFileSync(idlPath, 'utf8')) as RootNode;
}

const systemDisplayIdl = loadIdl('system-program-display-idl.json');

function createProgram() {
    const pubkey = PublicKey.default;
    return new CodamaUnifiedProgram(
        pubkey,
        systemDisplayIdl as unknown as BaseIdl,
        createProgramClient(systemDisplayIdl, { programId: pubkey.toBase58() }),
    );
}

const SOURCE = gen.address(1);
const DESTINATION = gen.address(2);

function createValues({
    amount = '1500000000',
    destination = DESTINATION,
    source = SOURCE,
}: { amount?: string; destination?: string; source?: string } = {}): InstructionFormData {
    return {
        accounts: { transferSol: { destination, source } },
        arguments: { transferSol: { amount } },
    };
}

describe('getFormInstructionDisplay', () => {
    it('should resolve the display from form values', async () => {
        const display = await getFormInstructionDisplay({
            instructionName: 'transferSol',
            program: createProgram(),
            values: createValues(),
        });

        expect(display?.interpolatedIntent).toBe(`Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`);
    });

    it('should return null when the program does not support display', async () => {
        const program = { buildInstruction: async () => ({}) } as unknown as UnifiedProgram;

        const display = await getFormInstructionDisplay({
            instructionName: 'transferSol',
            program,
            values: createValues(),
        });

        expect(display).toBeUndefined();
    });

    it('should reject when a required account is still blank', async () => {
        await expect(
            getFormInstructionDisplay({
                instructionName: 'transferSol',
                program: createProgram(),
                values: createValues({ source: '' }),
            }),
        ).rejects.toThrow();
    });

    it('should reject when an account address is malformed', async () => {
        await expect(
            getFormInstructionDisplay({
                instructionName: 'transferSol',
                program: createProgram(),
                values: createValues({ source: 'not-an-address' }),
            }),
        ).rejects.toThrow('Invalid public key for account "source"');
    });

    it('should reject when an argument cannot be converted', async () => {
        await expect(
            getFormInstructionDisplay({
                instructionName: 'transferSol',
                program: createProgram(),
                values: createValues({ amount: 'not-a-number' }),
            }),
            // eslint-disable-next-line no-restricted-syntax -- regex needed to match partial error message
        ).rejects.toThrow(/Could not convert "amount" argument/);
    });
});
