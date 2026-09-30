import { describe, expect, it } from 'vitest';

import { parseIntentTemplate, shortenAddress, splitIntentSentence } from './intent-text';

const SOURCE = 'Gjzy5nK46npKae6cKsCpnXwnePkyBTesUQfHVSqX1GBv';
const DESTINATION = 'EjYkrNiQNd6QHhKx5yYARxWXvSNsJ11CLJPhgUrhPE5M';

describe('splitIntentSentence', () => {
    it('should separate addresses from the prose around them', () => {
        expect(splitIntentSentence(`Transfer 1.5 SOL from ${SOURCE} to ${DESTINATION}`)).toEqual([
            { kind: 'text', text: 'Transfer 1.5 SOL from ' },
            { address: SOURCE, kind: 'address' },
            { kind: 'text', text: ' to ' },
            { address: DESTINATION, kind: 'address' },
        ]);
    });

    it('should keep a sentence without addresses as one text run', () => {
        expect(splitIntentSentence('Set the compute unit limit to 450000')).toEqual([
            { kind: 'text', text: 'Set the compute unit limit to 450000' },
        ]);
    });

    it('should not treat a long zero-free number as an address', () => {
        const number = '123456789123456789123456789123456';

        expect(splitIntentSentence(`Transfer ${number} base units`)).toEqual([
            { kind: 'text', text: `Transfer ${number} base units` },
        ]);
    });
});

describe('parseIntentTemplate', () => {
    it('should expose each placeholder with its source and name', () => {
        expect(parseIntentTemplate('Transfer ${data.amount} from ${accounts.source}')).toEqual([
            { kind: 'text', text: 'Transfer ' },
            { kind: 'placeholder', name: 'amount', source: 'data' },
            { kind: 'text', text: ' from ' },
            { kind: 'placeholder', name: 'source', source: 'accounts' },
        ]);
    });

    it('should keep a template without placeholders as one text run', () => {
        expect(parseIntentTemplate('Sync native')).toEqual([{ kind: 'text', text: 'Sync native' }]);
    });
});

describe('shortenAddress', () => {
    it('should keep five characters on each side', () => {
        expect(shortenAddress(SOURCE)).toBe('Gjzy5…X1GBv');
    });

    it('should leave a value too short to shorten untouched', () => {
        expect(shortenAddress('short')).toBe('short');
    });
});
