import type { InstructionParser } from '@entities/instruction-parser';
import { TOKEN_PROGRAM_ID } from '@providers/accounts/tokens';

import { parseTokenInstruction, parseTokenRpcInstruction, type TokenParsed } from './token-parser';

export const tokenInstructionParser: InstructionParser<TokenParsed> = {
    fromParsed: parseTokenRpcInstruction,
    fromTransaction: parseTokenInstruction,
    programId: TOKEN_PROGRAM_ID.toBase58(),
    programLabel: 'spl-token',
};
