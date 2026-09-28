import { TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { gen } from '../../__tests__/gen.js';
import { getTransactionConfig } from '../config.js';
import {
    fromCompiledMessage,
    fromMessageBytes,
    fromRpcTransaction,
    getAddressTableLookups,
} from '../parse-transaction.js';
import type { RpcTransactionResponse } from '../types.js';
import { UnsupportedTransactionVersionError } from '../version.js';
import {
    INSTRUCTION_DATA,
    jsonParsedResponse,
    jsonResponse,
    legacyTransaction,
    legacyTransactionWithHeader,
    unsignedWireResponse,
    v0CompiledWithLookupTable,
    v0Transaction,
    v1CompiledWithConfig,
    v1Transaction,
    wireResponse,
} from './fixtures.js';

describe('fromCompiledMessage', () => {
    it('should get the version from the message', () => {
        expect(fromCompiledMessage(legacyTransaction.compiled()).version).toBe('legacy');
        expect(fromCompiledMessage(v0Transaction.compiled()).version).toBe(0);
        expect(fromCompiledMessage(v1Transaction.compiled()).version).toBe(1);
    });

    it('should resolve instructions with their accounts', () => {
        const transaction = fromCompiledMessage(v1Transaction.compiled());

        expect(transaction.instructions).toHaveLength(1);
        expect(transaction.instructions[0].programAddress).toBe(v1Transaction.compiled().staticAccounts[1]);
        expect(transaction.instructions[0].accounts[0].address).toBe(v1Transaction.compiled().staticAccounts[0]);
    });

    it('should return the config for the v1 tx only', () => {
        const v1 = fromCompiledMessage(
            v1CompiledWithConfig({
                configMask: TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
                configValues: [{ kind: 'u32', value: 19 }],
            }),
        );
        const v0 = fromCompiledMessage(v0Transaction.compiled());

        expect(getTransactionConfig(v1)).toEqual({ computeUnitLimit: 19 });
        expect(getTransactionConfig(v0)).toBeUndefined();
    });

    it('should return the address table lookups for the v0 tx only', () => {
        expect(getAddressTableLookups(fromCompiledMessage(v0Transaction.compiled()))).toEqual([]);
        expect(getAddressTableLookups(fromCompiledMessage(v1Transaction.compiled()))).toEqual([]);
    });

    it('should accept caller-provided loaded addresses as strings', () => {
        const transaction = fromCompiledMessage(v0Transaction.compiled(), {
            loadedAddresses: { readonly: [], writable: [] },
        });

        expect(transaction.accounts).toHaveLength(v0Transaction.compiled().staticAccounts.length);
    });

    it('should return unmatched addresses for a v0 message with no listed lookup tables', () => {
        const transaction = fromCompiledMessage(v0Transaction.compiled(), {
            loadedAddresses: { readonly: [gen.address(6)], writable: [gen.address(5)] },
        });

        expect(transaction.unmatchedLookupTableAddresses).toEqual([gen.address(5), gen.address(6)]);
    });

    it('should map compiled lookup table address to accountKey', () => {
        const { compiled, loadedAddress, lookupTableAddress } = v0CompiledWithLookupTable();
        const transaction = fromCompiledMessage(compiled, {
            loadedAddresses: { readonly: [], writable: [loadedAddress] },
        });

        expect(getAddressTableLookups(transaction)).toEqual([
            { accountKey: lookupTableAddress, readonlyIndexes: [], writableIndexes: [0] },
        ]);
    });

    it('should return unmatched addresses for a v0 message with more loaded addresses than its lookup table lists', () => {
        const { compiled, loadedAddress } = v0CompiledWithLookupTable();
        const extraAddress = gen.address(12);

        const transaction = fromCompiledMessage(compiled, {
            loadedAddresses: { readonly: [], writable: [loadedAddress, extraAddress] },
        });

        expect(transaction.unmatchedLookupTableAddresses).toEqual([extraAddress]);
    });

    it('should reject a compiled message with a zero signer count', () => {
        const { compiled } = legacyTransactionWithHeader({ numSignerAccounts: 0 });

        expect(() => fromCompiledMessage(compiled)).toThrow('out of range for');
    });

    it('should reject a compiled message with a negative readonly signer count', () => {
        const { compiled } = legacyTransactionWithHeader({ numReadonlySignerAccounts: -1 });

        expect(() => fromCompiledMessage(compiled)).toThrow('negative readonly account count');
    });

    it('should reject a compiled message where readonly signers exceed available accounts', () => {
        const { compiled } = legacyTransactionWithHeader({ numReadonlySignerAccounts: 1 });

        expect(() => fromCompiledMessage(compiled)).toThrow('exceed available accounts');
    });
});

describe('fromMessageBytes', () => {
    it('should decode bytes into the same value as the compiled message', () => {
        expect(fromMessageBytes(v1Transaction.messageBytes())).toEqual(fromCompiledMessage(v1Transaction.compiled()));
    });

    it('should reject bytes that carry more than the message', () => {
        const trailing = new Uint8Array([...v1Transaction.messageBytes(), 0x00]);

        expect(() => fromMessageBytes(trailing)).toThrow('canonical');
    });

    it('should decode a v0 message', () => {
        expect(fromMessageBytes(v0Transaction.messageBytes())).toEqual(fromCompiledMessage(v0Transaction.compiled()));
    });

    it('should reject message bytes with an invalid header', () => {
        const { messageBytes } = legacyTransactionWithHeader({ numSignerAccounts: 0 });

        expect(() => fromMessageBytes(messageBytes)).toThrow('out of range for');
    });
});

describe('fromRpcTransaction', () => {
    it('should read a wire-encoded response through the transaction decoder', () => {
        const transaction = fromRpcTransaction(wireResponse(1));

        expect(transaction.version).toBe(1);
        expect(transaction.instructions).toEqual(fromCompiledMessage(v1Transaction.compiled()).instructions);
    });

    it('should return the signatures from wire tx', () => {
        expect(fromRpcTransaction(wireResponse(1)).signatures).toEqual([gen.signature(1)]);
    });

    it('should return undefined for an unsigned signer slot', () => {
        expect(fromRpcTransaction(unsignedWireResponse(1)).signatures[0]).toBeUndefined();
    });

    it('should decode a base58-encoded response to the same value as a base64 one', () => {
        expect(fromRpcTransaction(wireResponse(1, 'base58'))).toEqual(fromRpcTransaction(wireResponse(1, 'base64')));
    });

    it.each(['base64', 'base58'] as const)('should parse a %s wire response with no version reported', encoding => {
        const { transaction } = wireResponse(1, encoding);

        expect(fromRpcTransaction({ transaction }).version).toBe(1);
    });

    it('should accept loaded addresses from wire response meta', () => {
        const response = {
            ...wireResponse(0),
            meta: { loadedAddresses: { readonly: [gen.address(6)], writable: [gen.address(5)] } },
        };

        expect(fromRpcTransaction(response).accounts).toHaveLength(v0Transaction.compiled().staticAccounts.length + 2);
    });

    it('should read a json response, decoding its base58 instruction data', () => {
        const transaction = fromRpcTransaction(jsonResponse(1));

        expect(transaction.version).toBe(1);
        expect(transaction.instructions[0].data).toEqual(INSTRUCTION_DATA);
    });

    it('should read a v0 JSON response with an address table lookup', () => {
        const response = jsonResponse(0);
        const table = gen.address(9);
        response.transaction.message.addressTableLookups = [
            { accountKey: table, readonlyIndexes: [], writableIndexes: [] },
        ];

        expect(getAddressTableLookups(fromRpcTransaction(response))).toEqual([
            { accountKey: table, readonlyIndexes: [], writableIndexes: [] },
        ]);
    });

    it('should return unfilled lookup indexes', () => {
        const response = jsonResponse(0);
        const table = gen.address(9);
        response.transaction.message.addressTableLookups = [
            { accountKey: table, readonlyIndexes: [], writableIndexes: [3] },
        ];

        expect(fromRpcTransaction(response).unmatchedLookupTableIndexes).toEqual([
            { accountKey: table, readonlyIndexes: [], writableIndexes: [3] },
        ]);
    });

    it('should leave lookups unreported when a v0 JSON response omits them', () => {
        const transaction = fromRpcTransaction(jsonResponse(0));

        expect(transaction.version).toBe(0);
        expect('addressTableLookups' in transaction).toBe(false);
    });

    it('should read a jsonParsed response with RPC-resolved account roles', () => {
        const transaction = fromRpcTransaction(jsonParsedResponse(1));

        expect(transaction.accounts[0]).toMatchObject({ signer: true, source: 'static', writable: true });
    });

    it('should carry the RPC decode when a jsonParsed instruction has no data', () => {
        const response = jsonParsedResponse(1);
        response.transaction.message.instructions = [
            {
                parsed: { type: 'transfer' },
                program: 'system',
                programId: response.transaction.message.accountKeys[1].pubkey,
            },
        ];

        const transaction = fromRpcTransaction(response);

        expect(transaction.instructions[0]).toMatchObject({ parsed: { type: 'transfer' } });
        expect(transaction.instructions[0].data).toBeUndefined();
    });

    it('should resolve a jsonParsed instruction account against a lookup-table-sourced key', () => {
        const response = jsonParsedResponse(0);
        const lookupAddress = gen.address(8);
        const program = response.transaction.message.accountKeys[1].pubkey;

        response.transaction.message.accountKeys = [
            ...response.transaction.message.accountKeys,
            { pubkey: lookupAddress, signer: false, source: 'lookupTable', writable: true },
        ];
        response.transaction.message.instructions = [{ accounts: [lookupAddress], data: '2Jq', programId: program }];

        const transaction = fromRpcTransaction(response);

        expect(transaction.instructions[0].accounts[0]).toMatchObject({
            address: lookupAddress,
            source: 'lookupTable',
        });
    });

    it('should reject a jsonParsed instruction account missing from accountKeys', () => {
        const response = jsonParsedResponse(1);
        const program = response.transaction.message.accountKeys[1].pubkey;
        response.transaction.message.instructions = [{ accounts: [gen.address(11)], data: '2Jq', programId: program }];

        expect(() => fromRpcTransaction(response)).toThrow('not in the resolved account list');
    });

    it('should return no address table lookups for a jsonParsed v0 response', () => {
        expect(getAddressTableLookups(fromRpcTransaction(jsonParsedResponse(0)))).toEqual([]);
    });

    it('should accept a bigint version, which kit does not coerce', () => {
        expect(fromRpcTransaction({ ...jsonResponse(1), version: 1n }).version).toBe(1);
    });

    it('should reject a null version', () => {
        // eslint-disable-next-line unicorn/no-null -- the RPC reports null when no ceiling was sent
        expect(() => fromRpcTransaction({ ...jsonResponse(1), version: null })).toThrow(
            UnsupportedTransactionVersionError,
        );
    });

    it('should reject an unknown version', () => {
        expect(() =>
            fromRpcTransaction({ ...jsonResponse(1), version: 2 } as unknown as RpcTransactionResponse),
        ).toThrow(UnsupportedTransactionVersionError);
    });

    it('should reject a header with counts exceeding the account list', () => {
        const response = jsonResponse(0);
        response.transaction.message.header.numRequiredSignatures = 99;

        expect(() => fromRpcTransaction(response)).toThrow('out of range for');
    });

    it('should reject a header with a zero signer count', () => {
        const response = jsonResponse(0);
        response.transaction.message.header.numRequiredSignatures = 0;

        expect(() => fromRpcTransaction(response)).toThrow('out of range for');
    });

    it('should reject a header with a negative readonly account count', () => {
        const response = jsonResponse(0);
        response.transaction.message.header.numReadonlySignedAccounts = -1;

        expect(() => fromRpcTransaction(response)).toThrow('negative readonly account count');
    });

    it('should reject a header when readonly counts exceed available accounts', () => {
        const response = jsonResponse(0);
        response.transaction.message.header.numReadonlySignedAccounts = 1;

        expect(() => fromRpcTransaction(response)).toThrow('exceed available accounts');
    });

    it('should reject an instruction index outside the account list', () => {
        const response = jsonResponse(0);
        response.transaction.message.instructions = [{ accounts: [99], data: '', programIdIndex: 1 }];

        expect(() => fromRpcTransaction(response)).toThrow('index out of bounds');
    });

    it('should reject a program index outside the account list', () => {
        const response = jsonResponse(0);
        response.transaction.message.instructions = [{ accounts: [0], data: '', programIdIndex: 99 }];

        expect(() => fromRpcTransaction(response)).toThrow('index out of bounds');
    });
});
