// Probes the BUILT declarations: the conversion tuple must stay precisely typed (toEqualTypeOf
// fails if a member degrades to `any` in dist/*.d.ts).
import { type CodamaIdl, IDL_ERROR__IDL_PARSE_FAILED, type IdlError } from '@explorer/idl';
import { convertToCodama } from '@explorer/idl/codama';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { loadSimpleIdl } from '../../src/__tests__/fixtures';

describe('built declarations type probe', () => {
    it('should keep the convertToCodama result tuple precisely typed', () => {
        const [conversionError, converted] = convertToCodama(loadSimpleIdl());

        expectTypeOf(converted).toEqualTypeOf<CodamaIdl | undefined>();
        expectTypeOf(conversionError).toEqualTypeOf<IdlError<typeof IDL_ERROR__IDL_PARSE_FAILED> | undefined>();
        expect(conversionError).toBeUndefined();
        expect(converted).toBeDefined();
    });
});
