/**
 * Drops the `SIMD-0266: ` lead from a feature title, for a layout that shows the SIMDs as badges in front of it.
 * Covers the joined forms (`SIMD-0178/0189/0377: `, `SIMD-0437-1: `); any other lead (`SIMD-0186 Amendment: `)
 * carries meaning and stays.
 */
export function stripSimdPrefix(title: string): string {
    // eslint-disable-next-line no-restricted-syntax -- the lead is `SIMD-` plus digits joined by `/` or `-`, then `: `
    return title.replace(/^SIMD-\d+(?:[/-]\d+)*:\s+/, '');
}
