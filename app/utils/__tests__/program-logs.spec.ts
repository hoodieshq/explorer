import { describe, expect, it } from 'vitest';

import { Cluster } from '../cluster';
import { parseProgramLogs } from '../program-logs';

const PROGRAM = 'devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH';
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('parseProgramLogs', () => {
    it('should record the call depth of every line, 1 for the instruction program and deeper for its CPIs', () => {
        const [instruction] = parseProgramLogs(
            [
                `Program ${PROGRAM} invoke [1]`,
                'Program log: Instruction: SwapV2',
                `Program ${TOKEN} invoke [2]`,
                'Program log: Instruction: Transfer',
                `Program ${TOKEN} success`,
                `Program ${PROGRAM} success`,
            ],
            undefined,
            Cluster.Devnet,
        );

        expect(instruction.logs.map(({ depth, text }) => [depth, text])).toEqual([
            [1, 'Program logged: "Instruction: SwapV2"'],
            [1, expect.stringContaining('Program invoked:')],
            [2, 'Program logged: "Instruction: Transfer"'],
            [2, 'Program returned success'],
            [1, 'Program returned success'],
        ]);
    });
});
