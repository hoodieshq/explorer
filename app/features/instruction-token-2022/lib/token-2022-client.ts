import type { InstructionParser } from '@entities/instruction-parser';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';

import { parseToken2022Instruction, parseToken2022RpcInstruction, type Token2022Parsed } from './token-2022-parser';

export const token2022InstructionParser: InstructionParser<Token2022Parsed> = {
    fromParsed: parseToken2022RpcInstruction,
    fromTransaction: parseToken2022Instruction,
    programId: TOKEN_2022_PROGRAM_ADDRESS,
    programLabel: 'spl-token-2022',
};
