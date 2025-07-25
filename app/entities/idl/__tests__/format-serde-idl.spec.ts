import { Idl as AnchorIdl } from '@coral-xyz/anchor';

import { formatSerdeIdl } from '../formatters/format-serde-idl';
import anchor029Devi from '../mocks/anchor/anchor-0.29.0-devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH.json';
import anchor030EJAf from '../mocks/anchor/anchor-0.30.0-EJAfNJ5Ue5xcJT17A3i9Yz594V4LZxhmuiautaT1U1F4.json';
import anchor030gozh from '../mocks/anchor/anchor-0.30.0-gozqhNH1QuHW4TtEfaAde73FyvW452eXi3JEMLqvS5Q.json';
import anchor030whir from '../mocks/anchor/anchor-0.30.0-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
import anchor030devi from '../mocks/anchor/anchor-0.30.1-devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH.json';
import anchorLegacy034whir from '../mocks/anchor/anchor-legacy-0.3.4-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
import anchorLegacy036whir from '../mocks/anchor/anchor-legacy-0.3.6-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
import anchorLegacy094ShankWave from '../mocks/anchor/anchor-legacy-0.9.4-shank-waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF.json';
import anchorLegacyAccountComp from '../mocks/anchor/anchor-legacy-account_compression-compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq.json';
import anchorLegacyBubblegum from '../mocks/anchor/anchor-legacy-bubblegum-BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY.json';
import anchorLegacyLightComprssedToken from '../mocks/anchor/anchor-legacy-light_compressed_token-cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m.json';
import anchorLegacySplAccountCompr from '../mocks/anchor/anchor-legacy-spl_account_compression-cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK.json';
import anchorLegacyStakeProgram from '../mocks/anchor/anchor-legacy-stake_program-GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu.json';
import anchor029 from '../mocks/anchor/reference-0.29.json';
import anchor030 from '../mocks/anchor/reference-0.30.json';
import { extractProgramAddressFromIdlData } from '../utils';

describe('Implementation for `formatSerdeIdl`', () => {
    it('should work for devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchor029Devi);
        expect('0.1.0').toBe(anchor029Devi.version);
        expect(() => {
            idl = formatSerdeIdl(anchor029Devi, address);

            expect(idl?.metadata).toStrictEqual({ name: 'amm_v3', version: '0.1.0' });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for EJAfNJ5Ue5xcJT17A3i9Yz594V4LZxhmuiautaT1U1F4 program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchor030EJAf);
        expect('0.1.0').toBe(anchor030EJAf.metadata.version);
        expect(() => {
            idl = formatSerdeIdl(anchor030EJAf, address);

            expect(idl?.metadata).toStrictEqual({
                description: 'Cross-chain vevnx program',
                name: 'cross_chain_vevnx',
                spec: '0.1.0',
                version: '0.1.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for gozqhNH1QuHW4TtEfaAde73FyvW452eXi3JEMLqvS5Q program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchor030gozh);
        expect('0.1.0').toBe(anchor030gozh.metadata.version);
        expect(() => {
            idl = formatSerdeIdl(anchor030gozh, address);

            expect(idl?.metadata).toStrictEqual({
                description: 'Cross-chain Solana SPL gauge',
                name: 'cross_chain_gauge_spl',
                spec: '0.1.0',
                version: '0.1.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchor030whir);
        expect('0.3.4').toBe(anchor030whir.metadata.version);
        expect(() => {
            idl = formatSerdeIdl(anchor030whir, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'whirlpool',
                spec: '0.1.0',
                version: '0.3.4',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchor030devi);
        expect('0.1.0').toBe(anchor030devi.metadata.version);
        expect(() => {
            idl = formatSerdeIdl(anchor030devi, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'amm_v3',
                spec: '0.1.0',
                version: '0.1.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for 0.3.4 whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchorLegacy034whir);
        expect('0.3.4').toBe(anchorLegacy034whir.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacy034whir, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'whirlpool',
                version: '0.3.4',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    /**
     * This version of IDL does not contain the address
     */
    it('should work for 0.3.6 whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(
            anchorLegacy036whir,
            'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
        );
        expect('0.3.6').toBe(anchorLegacy036whir.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacy036whir, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'whirlpool',
                version: '0.3.6',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for 1.0.0 compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq account_compression program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(
            anchorLegacyAccountComp,
            'compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq'
        );
        expect('1.0.0').toBe(anchorLegacyAccountComp.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacyAccountComp, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'account_compression',
                version: '1.0.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for 0.12.0 BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY bubblegum program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(
            anchorLegacyBubblegum,
            'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
        );
        expect('0.12.0').toBe(anchorLegacyBubblegum.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacyBubblegum, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'bubblegum',
                version: '0.12.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for 1.0.0 cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m light_compressed_token program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(
            anchorLegacyLightComprssedToken,
            'cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m'
        );
        expect('1.0.0').toBe(anchorLegacyLightComprssedToken.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacyLightComprssedToken, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'light_compressed_token',
                version: '1.0.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for 0.1.2 cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK spl_account_compression program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(
            anchorLegacySplAccountCompr,
            'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'
        );
        expect('0.1.2').toBe(anchorLegacySplAccountCompr.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacySplAccountCompr, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'spl_account_compression',
                version: '0.1.2',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    it('should work for 0.1.0 GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu stake_program program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(
            anchorLegacyStakeProgram,
            'GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu'
        );
        expect('0.1.0').toBe(anchorLegacyStakeProgram.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacyStakeProgram, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'stake_program',
                version: '0.1.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    // https://github.com/solana-foundation/anchor/pull/2824
    // https://github.com/acheroncrypto/anchor/blob/fix-idl/tests/idl/programs/idl/src/lib.rs
    // https://www.diffchecker.com/JqI33i4w/
    it('should work for 0.29 reference program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchor029, new Array(31).fill('1').concat(['2']).join(''));
        expect('0.1.0').toBe(anchor029.version);
        expect(() => {
            idl = formatSerdeIdl(anchor029, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'idl',
                version: '0.1.0',
            });
            expect(idl?.address).toBe(address);
        }).not.toThrowError();
    });

    /**
     * Unsupported IDLs
     */

    /**
     * Account does not contain "kind" and it can not be parsed by "convertTypeDef"
     * https://github.com/solana-developers/helpers/blob/a7e75d04cd4a83e6276a12526e839b2bf1d7b774/src/lib/convertLegacyIdl.ts#L180
     *  {
     *      "name": "SomeZcAccount",
     *      "discriminator": [56, 72, 82, 194, 210, 35, 17, 191]
     *  },
     */
    it('should fail for 0.30 reference program', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(anchor030, new Array(31).fill('1').concat(['3']).join(''));
        expect('0.1.0').toBe(anchor030.metadata.version);
        expect(() => {
            idl = formatSerdeIdl(anchor030, address);
            console.log({ idl });
            expect(idl?.metadata).toStrictEqual({
                description: 'Created with Anchor',
                name: 'idl',
                version: '0.1.0',
            });
            expect(idl?.address).toBe(address);
        }).toThrowError(new TypeError("Cannot read properties of undefined (reading 'kind')"));
    });

    it('should work for 0.9.4 waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF program as it contains unsuported types', async () => {
        let idl: AnchorIdl;
        const address = extractProgramAddressFromIdlData(
            anchorLegacy094ShankWave,
            'waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF'
        );
        expect('0.9.4').toBe(anchorLegacy094ShankWave.version);
        expect(() => {
            idl = formatSerdeIdl(anchorLegacy094ShankWave, address);

            expect(idl?.metadata).toStrictEqual({
                name: 'orca_wavebreak_program',
                version: '0.9.4',
            });
            expect(idl?.address).toBe(address);
            expect([5, 0, 30, 0, 56, 16]).toEqual(
                getFieldLengths(['accounts', 'constants', 'errors', 'events', 'instructions', 'types'], idl)
            );
        }).not.toThrowError();
    });
});

type IdlStructs = Pick<AnchorIdl, 'accounts' | 'constants' | 'errors' | 'events' | 'instructions' | 'types'>;
function getFieldLengths(keys: Array<keyof IdlStructs>, idl?: IdlStructs) {
    if (!idl) throw new Error('IDL is absent');
    return keys.reduce((acc, key) => {
        if (key in idl) {
            const field = idl[key];
            const numberOfMembers = field?.length;
            return acc.concat(numberOfMembers ?? -1);
        }
        return acc;
    }, [] as number[]);
}
