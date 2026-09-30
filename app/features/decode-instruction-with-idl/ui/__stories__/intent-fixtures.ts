import type { InstructionDisplay } from '@codama/dynamic-instructions';

export const SOURCE = '8AnqSPLDLU5gPpEpKs2zGBRHJYW11M1F2EwAwqYt4XbW';
export const DESTINATION = 'EjYkrNiQNd6QHhKx5yYARxWXvSNsJ11CLJPhgUrhPE5M';
export const AUTHORITY = '4tvnspM9Af164V6sBLrCB14p4nKUrJeNWTRRDRVUVWHo';

/** A Token Program transfer as the SDK returns it, read with mint data from the chain. */
export const TRANSFER_TOKENS_DISPLAY: InstructionDisplay = {
    fields: [
        { label: 'Amount', value: '100000000 base units' },
        { label: 'From', value: SOURCE },
        { label: 'To', value: DESTINATION },
        { label: 'Authority', value: AUTHORITY },
    ],
    intent: 'Transfer tokens',
    interpolatedIntent: `Transfer 100000000 base units from ${SOURCE} to ${DESTINATION}`,
};

/** The same instruction when the program's metadata carries no sentence for it. */
export const NO_SENTENCE_DISPLAY: InstructionDisplay = {
    ...TRANSFER_TOKENS_DISPLAY,
    intent: 'Transfer',
    // eslint-disable-next-line unicorn/no-null -- the SDK reports a withheld sentence as null
    interpolatedIntent: null,
};
