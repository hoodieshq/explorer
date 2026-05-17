import { describe, expect, it } from 'vitest';

import { assertSimulationOk } from '../simulate-transaction';

describe('assertSimulationOk', () => {
    it('should be a no-op when err is null', () => {
        expect(() => assertSimulationOk(null, [])).not.toThrow();
    });

    it('should resolve IDL error name from Custom code', () => {
        const err = { InstructionError: [0, { Custom: 6001 }] } as any;
        const idlErrors = [{ code: 6001, name: 'AlreadyInitialized' }];
        expect(() => assertSimulationOk(err, idlErrors)).toThrow('AlreadyInitialized');
        expect(() => assertSimulationOk(err, idlErrors)).toThrow('code:6001');
    });

    it('should fall back to programError.message when IDL lookup misses', () => {
        const err = { InstructionError: [0, { Custom: 9999 }] } as any;
        expect(() => assertSimulationOk(err, [])).toThrow('Instruction #1 got ');
    });

    it('should throw generic JSON error for non-InstructionError variants', () => {
        expect(() => assertSimulationOk({ Unknown: 'error' } as any, [])).toThrow('Simulated with errors');
    });
});
