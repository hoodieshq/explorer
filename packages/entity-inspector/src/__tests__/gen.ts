import { addressFromSeed } from '@explorer/utils/testing';
import { address } from '@solana/kit';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';

// Well-known addresses used as placeholders across this package's specs. Program addresses with a
// @solana-program client come from it. Sysvars, wrapped-SOL and programs with no client dep stay literals.
export const gen = {
    address: addressFromSeed,
    bpfUpgradeableLoader: address('BPFLoaderUpgradeab1e11111111111111111111111'),
    computeBudgetProgram: address('ComputeBudget111111111111111111111111111111'),
    stakeProgram: address('Stake11111111111111111111111111111111111111'),
    sysvarClock: address('SysvarC1ock11111111111111111111111111111111'),
    sysvarRent: address('SysvarRent111111111111111111111111111111111'),
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    voteProgram: address('Vote111111111111111111111111111111111111111'),
    wrappedSol: address('So11111111111111111111111111111111111111112'),
};
