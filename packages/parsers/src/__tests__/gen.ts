import { address, type Address, getBase58Decoder } from '@solana/kit';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';

const BASE58_DECODER = getBase58Decoder();

// Folding the high bits into byte 1 pushes the seed repeat out to 65536.
// Without it, seed and seed + 256 collide, because every other byte is taken mod 256.
function addressFromSeed(seed: number): Address {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (seed * 19 + i * 23 + 5) & 0xff;
    bytes[1] = (bytes[1] + (seed >>> 8)) & 0xff;
    return address(BASE58_DECODER.decode(bytes));
}

// 64 bytes rather than 32, matching a real signature's length.
function signatureFromSeed(seed: number): string {
    const bytes = new Uint8Array(64);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (seed * 11 + i * 17) & 0xff;
    return BASE58_DECODER.decode(bytes);
}

// Unbranded, like `app/__fixtures__/gen.ts`. A fixture that feeds kit a lifetime wraps it in kit's
// `blockhash(...)`, which is where the brand belongs.
function blockhashFromSeed(seed: number): string {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (seed * 7 + i * 13) & 0xff;
    return BASE58_DECODER.decode(bytes);
}

// Well-known addresses used as placeholders across this package's specs. Program addresses come
// from their @solana-program client; sysvars and the wrapped-SOL mint have no such dep, so they stay literals.
export const gen = {
    address: addressFromSeed,
    blockhash: blockhashFromSeed,
    signature: signatureFromSeed,
    sysvarClock: address('SysvarC1ock11111111111111111111111111111111'),
    sysvarRent: address('SysvarRent111111111111111111111111111111111'),
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    voteProgram: address('Vote111111111111111111111111111111111111111'),
    wrappedSol: address('So11111111111111111111111111111111111111112'),
};
