import { describe, expect, it } from 'vitest';

import { buildReadback } from './build-readback';

const TEMPLATE = 'Transfer ${data.amount} from ${accounts.source} to ${accounts.destination}';
const SOURCE = 'Gjzy5nK46npKae6cKsCpnXwnePkyBTesUQfHVSqX1GBv';

function values({ amount = '', source = '', destination = '' } = {}) {
    return {
        accounts: { transferSol: { destination, source } },
        arguments: { transferSol: { amount } },
    };
}

describe('buildReadback', () => {
    it('should leave every placeholder as a slot on an empty form', () => {
        const readback = buildReadback({ instructionName: 'transferSol', template: TEMPLATE, values: values() });

        expect(readback.missing).toEqual(['amount', 'source', 'destination']);
        expect(readback.parts.filter(part => part.kind === 'missing')).toHaveLength(3);
    });

    it('should fill typed values and shorten addresses', () => {
        const readback = buildReadback({
            instructionName: 'transferSol',
            template: TEMPLATE,
            values: values({ amount: '1', source: SOURCE }),
        });

        expect(readback.parts).toEqual([
            { kind: 'text', text: 'Transfer ' },
            { isAddress: false, kind: 'filled', name: 'amount', text: '1' },
            { kind: 'text', text: ' from ' },
            { isAddress: true, kind: 'filled', name: 'source', text: 'Gjzy5…X1GBv' },
            { kind: 'text', text: ' to ' },
            { kind: 'missing', name: 'destination' },
        ]);
        expect(readback.missing).toEqual(['destination']);
    });

    it('should treat whitespace as missing', () => {
        const readback = buildReadback({
            instructionName: 'transferSol',
            template: TEMPLATE,
            values: values({ amount: '  ', destination: SOURCE, source: SOURCE }),
        });

        expect(readback.missing).toEqual(['amount']);
    });

    it('should match form keys that differ from the template in case or separators', () => {
        const readback = buildReadback({
            instructionName: 'createAccount',
            template: 'Create account ${accounts.newAccount}',
            values: { accounts: { createAccount: { new_account: SOURCE } } },
        });

        expect(readback.missing).toEqual([]);
    });

    it('should cope with values that have not been registered yet', () => {
        const readback = buildReadback({ instructionName: 'transferSol', template: TEMPLATE, values: {} });

        expect(readback.missing).toEqual(['amount', 'source', 'destination']);
    });
});
