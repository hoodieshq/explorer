import { gen } from '@__fixtures__/gen';
import { type Address, address } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { mockLookupTableRpc } from '@/app/__tests__/mock-rpc';
import {
    ALT_3_ADDRS,
    ALT_3_EXPECTED_ADDRESSES,
    encodeLookupTableData,
    lookupTableAccountInfo,
} from '@/app/fixtures/address-lookup-tables';

import { resolveAddressLookupTables } from '../resolve-address-lookup-tables';

const TABLE_1 = address(gen.address(11));
const TABLE_2 = address(gen.address(12));
const TABLE_1_ADDRESSES = [13, 14, 15].map(seed => address(gen.address(seed)));
const TABLE_2_ADDRESSES = [16, 17].map(seed => address(gen.address(seed)));

describe('resolveAddressLookupTables', () => {
    it('should return no addresses without calling the RPC when there are no lookups', async () => {
        const rpc = mockLookupTableRpc([]);

        await expect(resolveAddressLookupTables(rpc, [])).resolves.toEqual({ readonly: [], writable: [] });
        expect(rpc.getMultipleAccounts).not.toHaveBeenCalled();
    });

    it('should decode the addresses of a lookup table captured from mainnet', async () => {
        const rpc = mockLookupTableRpc([lookupTableAccountInfo(ALT_3_ADDRS)]);

        const result = await resolveAddressLookupTables(rpc, [lookup(TABLE_1, [], [0, 1, 2])]);

        expect(result).toEqual({ readonly: ALT_3_EXPECTED_ADDRESSES, writable: [] });
    });

    it('should group writable and readonly addresses across tables in table order', async () => {
        const rpc = mockLookupTableRpc([table(TABLE_1_ADDRESSES), table(TABLE_2_ADDRESSES)]);

        const result = await resolveAddressLookupTables(rpc, [lookup(TABLE_1, [2], [0]), lookup(TABLE_2, [1], [0])]);

        expect(result).toEqual({
            readonly: [TABLE_1_ADDRESSES[0], TABLE_2_ADDRESSES[0]],
            writable: [TABLE_1_ADDRESSES[2], TABLE_2_ADDRESSES[1]],
        });
    });

    it('should throw naming the table and index when the table has no address at that index', async () => {
        const rpc = mockLookupTableRpc([table(TABLE_1_ADDRESSES)]);

        await expect(resolveAddressLookupTables(rpc, [lookup(TABLE_1, [5], [])])).rejects.toThrow(
            `Address lookup table ${TABLE_1} has no address at index 5`,
        );
    });

    it('should throw naming the table when the RPC returns no account for one', async () => {
        const rpc = mockLookupTableRpc([null, table(TABLE_2_ADDRESSES)]);

        await expect(
            resolveAddressLookupTables(rpc, [lookup(TABLE_1, [], [0]), lookup(TABLE_2, [], [0])]),
        ).rejects.toThrow(`Address lookup table ${TABLE_1} could not be loaded`);
    });

    it('should batch all keys into a single RPC call', async () => {
        const rpc = mockLookupTableRpc([table(TABLE_1_ADDRESSES), table(TABLE_2_ADDRESSES)]);

        await resolveAddressLookupTables(rpc, [lookup(TABLE_1, [0], []), lookup(TABLE_2, [0], [])]);

        expect(rpc.getMultipleAccounts).toHaveBeenCalledTimes(1);
        expect(rpc.getMultipleAccounts).toHaveBeenCalledWith(
            [TABLE_1, TABLE_2],
            expect.objectContaining({ encoding: 'base64' }),
        );
    });

    it('should throw on the first table when none of them load', async () => {
        const rpc = mockLookupTableRpc([null, null]);

        await expect(
            resolveAddressLookupTables(rpc, [lookup(TABLE_1, [], [0]), lookup(TABLE_2, [], [0])]),
        ).rejects.toThrow(`Address lookup table ${TABLE_1} could not be loaded`);
    });
});

function table(addresses: Address[]) {
    return lookupTableAccountInfo(encodeLookupTableData(addresses));
}

function lookup(lookupTableAddress: Address, writableIndexes: number[], readonlyIndexes: number[]) {
    return { lookupTableAddress, readonlyIndexes, writableIndexes };
}
