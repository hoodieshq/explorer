import type { InstructionDisplay } from '@codama/dynamic-instructions';

export const SOURCE = 'Gjzy5nK46npKae6cKsCpnXwnePkyBTesUQfHVSqX1GBv';
export const DESTINATION = 'EjYkrNiQNd6QHhKx5yYARxWXvSNsJ11CLJPhgUrhPE5M';
export const AUTHORITY = '4tvnspM9Af164V6sBLrCB14p4nKUrJeNWTRRDRVUVWHo';

/** The SDK's output for a System Program transfer, verbatim. */
export const TRANSFER_SOL_DISPLAY: InstructionDisplay = {
    fields: [
        { label: 'Amount', value: '1.5 SOL' },
        { label: 'From', value: SOURCE },
        { label: 'To', value: DESTINATION },
    ],
    intent: 'Transfer SOL',
    interpolatedIntent: `Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`,
};

/** A Token Program transfer resolved without mint decimals: the amount stays in base units. */
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

/** A display whose sentence could not be resolved: only the short intent and the fields remain. */
export const NO_SENTENCE_DISPLAY: InstructionDisplay = {
    fields: [
        { label: 'Amount', value: '1500000 (raw)' },
        { label: 'Mint', value: DESTINATION },
    ],
    intent: 'Mint tokens',
    // eslint-disable-next-line unicorn/no-null -- the SDK reports a withheld sentence as null
    interpolatedIntent: null,
};
