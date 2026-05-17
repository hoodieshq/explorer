import { Keypair, Transaction, TransactionInstruction } from '@solana/web3.js';
import { describe, expect, it, vi } from 'vitest';

import { AnchorInterpreter } from '../../anchor/anchor-interpreter';
import type { IdlExecutor } from '../../idl-executor';
import { buildTransaction } from '../build-transaction';

const FEE_PAYER = Keypair.generate().publicKey;
const PROG_ID = Keypair.generate().publicKey;

function makeExecutor(returnIx: unknown): IdlExecutor {
    return { getInstruction: vi.fn().mockResolvedValue(returnIx) } as unknown as IdlExecutor;
}

describe('buildTransaction', () => {
    it('should return a Transaction with feePayer set and no recentBlockhash', async () => {
        const ix = new TransactionInstruction({
            data: Buffer.from([]),
            keys: [],
            programId: PROG_ID,
        });
        const tx = await buildTransaction({
            executor: makeExecutor(ix),
            feePayer: FEE_PAYER,
            idl: { instructions: [] },
            instructionName: 'foo',
            interpreterName: AnchorInterpreter.NAME,
            params: { accounts: { 'foo.a': PROG_ID.toBase58() }, arguments: {} },
            program: { buildInstruction: vi.fn(), idl: {}, programId: PROG_ID },
        });
        expect(tx).toBeInstanceOf(Transaction);
        expect(tx.feePayer?.equals(FEE_PAYER)).toBe(true);
        expect(tx.recentBlockhash).toBeUndefined();
        expect(tx.instructions).toHaveLength(1);
    });

    it('should throw on non-TransactionInstruction return from executor', async () => {
        await expect(
            buildTransaction({
                executor: makeExecutor({ not: 'a tx instruction' }),
                feePayer: FEE_PAYER,
                idl: { instructions: [] },
                instructionName: 'foo',
                interpreterName: AnchorInterpreter.NAME,
                params: { accounts: {}, arguments: {} },
                program: { buildInstruction: vi.fn(), idl: {}, programId: PROG_ID },
            }),
        ).rejects.toThrow('Unsupported instruction format');
    });
});
