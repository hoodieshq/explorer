import { createInstructionParserDispatcher } from '@entities/instruction-parser';
import { associatedTokenInstructionParser } from '@features/instruction-associated-token';
import { systemInstructionParser } from '@features/instruction-system';
import { tokenInstructionParser } from '@features/instruction-token';
import { token2022InstructionParser } from '@features/instruction-token-2022';
import { metaplexTokenMetadataInstructionParser } from '@features/mpl-token-metadata';

export const instructionParserDispatcher = createInstructionParserDispatcher([
    systemInstructionParser,
    tokenInstructionParser,
    token2022InstructionParser,
    associatedTokenInstructionParser,
    metaplexTokenMetadataInstructionParser,
]);
