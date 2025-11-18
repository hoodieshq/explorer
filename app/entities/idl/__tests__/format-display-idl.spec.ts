import { formatDisplayIdl, getFormattedIdl } from '@entities/idl/format';
import anchor029Devi from '@entities/idl/mocks/anchor/anchor-0.29.0-devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH.json';
import anchor030devi from '@entities/idl/mocks/anchor/anchor-0.30.1-devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH.json';
import anchorLegacy094ShankWave from '@entities/idl/mocks/anchor/anchor-legacy-0.9.4-shank-waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF.json';
import anchorLegacySplAccountCompr from '@entities/idl/mocks/anchor/anchor-legacy-spl_account_compression-cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK.json';
import { normalizeIdl } from '@entities/idl/model/use-anchor-program';
import { useFormatAnchorIdl } from '@features/idl/formatted-idl/model/use-format-anchor-idl'; // it is not a good practice to rely onto feature at entities, but currently formatting is inside the feature
import { renderHook } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

function toLengths(result: any) {
    return Object.keys(result ?? {}).map(field => {
        const obj: Record<string, any> = result as NonNullable<any>;
        return result ? obj[field]?.length : undefined;
    });
}

describe('formatDisplayIdl', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor029Devi, [8, 0, 42, 11, 23, 0, 5]],
        ['devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH', anchor030devi, [8, undefined, 42, 11, 23, 0, 9]],
        ['waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF', anchorLegacy094ShankWave, [5, 0, 30, 0, 56, 0, 11]],
        ['cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK', anchorLegacySplAccountCompr, [0, 0, 8, 0, 7, 0, 0]],
    ])(
        'should display %s program idl via useFormatAnchorIdl hook',
        (fallbackId: string, idl: any, structure: (number | undefined)[]) => {
            const programAddress = normalizeIdl(idl).address;
            const programId = programAddress || fallbackId;

            expect(() => {
                const formattedIdl = getFormattedIdl(formatDisplayIdl, idl, programId);
                expect(formattedIdl.address).toEqual(programId);

                const { result } = renderHook(() => useFormatAnchorIdl(formattedIdl));
                expect(toLengths(result.current)).toEqual(structure);
            }).not.toThrowError();
        }
    );
});
