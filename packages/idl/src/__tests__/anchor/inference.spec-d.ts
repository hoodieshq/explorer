// Compile-time guidance for the Anchor >= 0.30 routes — vitest typecheck only, nothing executes.
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import type { BN, IdlAccounts, IdlEvents } from '@coral-xyz/anchor';
import { describe, expectTypeOf, it } from 'vitest';

import { createIdlClient, type IdlClient, isAnchorStandard } from '../../client';
import { type AnchorIdl, type CodamaIdl, IdlStandard, type InstructionDecode } from '../../types';
import { anchorIdl, anchorIncrementIx, vaultDepositIx, type VaultIdl, vaultIdl } from '../fixtures';

describe('sample: Anchor >= 0.30 IDL — native vs nodes-from-anchor', () => {
    it('should keep the Anchor IDL type accessible on the native Anchor client', () => {
        const client = createIdlClient(anchorIdl);

        expectTypeOf(client).toEqualTypeOf<IdlClient<AnchorIdl>>();
        // the Anchor variant carries Anchor's own IDL type — anchor-typed guidance stays available
        expectTypeOf(client.idl).toEqualTypeOf<AnchorIdl>();
        if (isAnchorStandard(client)) {
            expectTypeOf(client.idl.instructions).toEqualTypeOf<AnchorIdl['instructions']>();
        }
        // all three decode arms stay possible (anchor decode with codama fallback)
        expectTypeOf(client.decodeInstruction(anchorIncrementIx)).toEqualTypeOf<InstructionDecode>();
    });

    it('should collapse to the codama-only surface once converted with nodes-from-anchor', () => {
        // nodes-from-anchor ships its own (narrower) Anchor IDL + RootNode types — same cast the app uses
        const root = rootNodeFromAnchor(anchorIdl as Parameters<typeof rootNodeFromAnchor>[0]) as unknown as CodamaIdl;
        const converted = createIdlClient(root);

        // normalize-first trades the anchor arm away STATICALLY — the compiler stops offering it
        expectTypeOf(converted).toEqualTypeOf<IdlClient<CodamaIdl>>();
        expectTypeOf(converted.decodeInstruction(anchorIncrementIx)).toEqualTypeOf<
            Exclude<InstructionDecode, { kind: IdlStandard.Anchor }>
        >();
    });
});

describe('sample: Anchor >= 0.30 with generated types (vault program)', () => {
    it('should preserve the generated literal type through the client', () => {
        const client = createIdlClient(vaultIdl);

        expectTypeOf(client).toEqualTypeOf<IdlClient<VaultIdl>>();
        // literal guidance survives: the compiler knows the exact instruction and argument
        expectTypeOf(client.idl.instructions[0].name).toEqualTypeOf<'deposit'>();
        expectTypeOf(client.idl.instructions[0].args[0].type).toEqualTypeOf<'u64'>();
        expectTypeOf(client.idl.instructions[0].accounts[0].name).toEqualTypeOf<'vault'>();
        // all decode arms stay open on the Anchor route
        expectTypeOf(client.decodeInstruction(vaultDepositIx)).toEqualTypeOf<InstructionDecode>();
    });

    it("should keep anchor's own type machinery usable on the client's idl", () => {
        type Vault = IdlClient<VaultIdl>['idl'];

        // account struct decoded type: one account, one u64 field
        expectTypeOf<IdlAccounts<Vault>['vault']>().toEqualTypeOf<{ balance: BN }>();
        // event payload type: one event, one u64 field
        expectTypeOf<IdlEvents<Vault>['depositMade']>().toEqualTypeOf<{ amount: BN }>();
        // error table: one literal-typed error entry (anchor 0.30.1 does not export IdlErrors — index directly)
        type VaultError = Vault['errors'][number];
        expectTypeOf<VaultError['code']>().toEqualTypeOf<6000>();
        expectTypeOf<VaultError['name']>().toEqualTypeOf<'insufficientFunds'>();
    });

    it('should degrade the same document to non-guidance once widened to the runtime Idl type', () => {
        // this is the runtime-fetched situation: same value, wide type — literal guidance is gone
        const widened: AnchorIdl = vaultIdl;
        const client = createIdlClient(widened);

        expectTypeOf(client).toEqualTypeOf<IdlClient<AnchorIdl>>();
        expectTypeOf(client.idl.instructions[0].name).toEqualTypeOf<string>();
    });
});
