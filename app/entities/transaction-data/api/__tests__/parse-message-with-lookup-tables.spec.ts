import { gen } from '@__fixtures__/gen';
import { createV0MessageBytes } from '@__fixtures__/transaction-message';
import { UnsupportedTransactionVersionError } from '@explorer/parsers/transaction';
import { AccountRole, address } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { mockLookupTableRpc } from '@/app/__tests__/mock-rpc';
import { encodeLookupTableData, lookupTableAccountInfo } from '@/app/fixtures/address-lookup-tables';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

import { createV1TransactionBytes, createWeb3TransactionBytes, FEE_PAYER } from '../../__fixtures__/wire-transactions';
import { parseMessageWithLookupTables } from '../parse-message-with-lookup-tables';

const TABLE = address(gen.address(21));
const PROGRAM = address(gen.address(22));
const OTHER = address(gen.address(23));
const LOADED = address(gen.address(24));

describe('parseMessageWithLookupTables', () => {
    it('should parse a legacy message without calling the RPC', async () => {
        const rpc = mockLookupTableRpc([]);
        const { messageBytes } = parseTransactionBytes(createWeb3TransactionBytes('legacy'));

        const { compiled, transaction } = await parseMessageWithLookupTables(rpc, messageBytes);

        expect(compiled.version).toBe('legacy');
        expect(transaction.version).toBe('legacy');
        expect(transaction.accounts[0].address).toBe(FEE_PAYER);
        expect(rpc.getMultipleAccounts).not.toHaveBeenCalled();
    });

    it('should add the addresses a v0 message loads from its lookup tables to its accounts', async () => {
        const rpc = mockLookupTableRpc([lookupTableAccountInfo(encodeLookupTableData([OTHER, LOADED]))]);
        const messageBytes = createV0MessageBytes(
            FEE_PAYER,
            {
                accounts: [{ address: LOADED, role: AccountRole.WRITABLE }],
                data: new Uint8Array([1]),
                programAddress: PROGRAM,
            },
            { [TABLE]: [OTHER, LOADED] },
        );

        const { transaction } = await parseMessageWithLookupTables(rpc, messageBytes);

        expect(transaction.accounts).toContainEqual({
            address: LOADED,
            lookupTableAddress: TABLE,
            signer: false,
            source: 'lookupTable',
            writable: true,
        });
    });

    it('should reject message bytes of an unknown version with a typed error', async () => {
        const rpc = mockLookupTableRpc([]);
        const { messageBytes } = parseTransactionBytes(createV1TransactionBytes({}));
        messageBytes[0] = 0x82;

        await expect(parseMessageWithLookupTables(rpc, messageBytes)).rejects.toThrow(
            UnsupportedTransactionVersionError,
        );
    });
});
