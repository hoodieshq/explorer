import { address, createNoopSigner } from '@solana/kit';
import { Keypair, PublicKey, TransactionInstruction, TransactionMessage } from '@solana/web3.js';
import { getUpdateTokenMetadataFieldInstruction, tokenMetadataField } from '@solana-program/token-2022';
import { describe, expect, it } from 'vitest';

import { privateIntoParsedData } from '../into-parsed-data';

type KitAccount = { address: string; role: number };
type KitInstruction = { accounts: readonly KitAccount[]; data: Uint8Array; programAddress: string };

function fromKitInstruction(kitIx: KitInstruction): TransactionInstruction {
    return new TransactionInstruction({
        data: Buffer.from(kitIx.data),
        keys: kitIx.accounts.map(acc => ({
            isSigner: (acc.role & 2) !== 0,
            isWritable: (acc.role & 1) !== 0,
            pubkey: new PublicKey(acc.address),
        })),
        programId: new PublicKey(kitIx.programAddress),
    });
}

describe('intoParsedData inspector pipeline — Token-2022 UpdateTokenMetadataField', () => {
    it('should parse field/value correctly when routed through TransactionMessage.decompile', () => {
        const payer = Keypair.generate().publicKey;
        const metadata = Keypair.generate().publicKey;
        const updateAuthority = Keypair.generate().publicKey;

        const kitIx = getUpdateTokenMetadataFieldInstruction({
            field: tokenMetadataField('Name'),
            metadata: address(metadata.toBase58()),
            updateAuthority: createNoopSigner(address(updateAuthority.toBase58())),
            value: 'My Token',
        });

        const message = new TransactionMessage({
            instructions: [fromKitInstruction(kitIx as unknown as KitInstruction)],
            payerKey: payer,
            recentBlockhash: Keypair.generate().publicKey.toBase58(),
        }).compileToV0Message();

        const decompiled = TransactionMessage.decompile(message);
        expect(decompiled.instructions).toHaveLength(1);

        const data = privateIntoParsedData(decompiled.instructions[0]);

        expect(data.type).toBe('updateTokenMetadataField');
        expect(data.info.field).toBe('name');
        expect(data.info.value).toBe('My Token');
        expect(data.info.metadata.toBase58()).toBe(metadata.toBase58());
        expect(data.info.updateAuthority.toBase58()).toBe(updateAuthority.toBase58());
    });
});
