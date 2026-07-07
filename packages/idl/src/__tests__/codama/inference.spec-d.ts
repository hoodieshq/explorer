// Compile-time guidance for the Codama route — validated by vitest typecheck mode, nothing executes.
import { describe, expectTypeOf, it } from 'vitest';

import { type IdlClient } from '../../client';
import { createCodamaIdlClient } from '../../codama/index';
import { type CodamaIdl, IdlStandard, type InstructionDecode } from '../../types';
import { loadTokenkegIdl, transferIx } from '../fixtures';

const codamaIdl = loadTokenkegIdl();
const codamaTransferIx = transferIx(codamaIdl);

describe('sample: Codama IDL', () => {
    it('should guide the developer into the codama-only surface', () => {
        const client = createCodamaIdlClient(codamaIdl);

        expectTypeOf(client).toEqualTypeOf<IdlClient<CodamaIdl>>();
        expectTypeOf(client.idl).toEqualTypeOf<CodamaIdl>();
        // the anchor arm is statically absent — no dead anchor branch can even be written
        expectTypeOf(client.decodeInstruction(codamaTransferIx)).toEqualTypeOf<
            Exclude<InstructionDecode, { kind: IdlStandard.Anchor }>
        >();
        // the handler map compiles with exactly the codama + unknown arms
        client.decodeInstruction(codamaTransferIx, { codama: () => 0, unknown: () => 0 });
    });
});
