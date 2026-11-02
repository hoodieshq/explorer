import { address } from '@solana/kit';

import type { TokenInstructionRowView } from '../BaseTokenInstructionsCard';

const SIGNATURES = {
    failed: '5YtADoExampleTokenInstructionSignaturePlaceholderForStoriesLJatMabcdefghi',
    first: '2JgaFoExampleTokenInstructionSignaturePlaceholderForStoriesZBbGUabcdefghij',
    third: 'dbaW9oExampleTokenInstructionSignaturePlaceholderForStoriesfa3ewabcdefghijk',
};

const PROGRAMS = {
    token: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    // A plain wallet address standing in for a program the explorer has no name for, so the cell shows
    // how a raw base58 key truncates.
    unknown: address('Fw1ETanDZafof7xEULsnq9UY6o71Tpds89tNwPkWLb1v'),
};

export const BLOCK_TIME = 1_718_000_000;

export function makeRow(
    overrides: Partial<TokenInstructionRowView> & Pick<TokenInstructionRowView, 'key'>,
): TokenInstructionRowView {
    return {
        blockTime: BLOCK_TIME,
        instructionName: 'Transfer',
        programId: PROGRAMS.token,
        signature: SIGNATURES.first,
        status: 'success',
        ...overrides,
    };
}

// Two instructions from one transaction, a failed transaction, and a program without a known name.
export const INSTRUCTION_ROWS: TokenInstructionRowView[] = [
    makeRow({ instructionName: 'Transfer (Checked)', key: 'first-0' }),
    makeRow({ instructionName: 'Close Account', key: 'first-1' }),
    makeRow({
        blockTime: BLOCK_TIME - 600,
        instructionName: 'Approve',
        key: 'failed-0',
        signature: SIGNATURES.failed,
        status: 'failed',
    }),
    makeRow({
        blockTime: BLOCK_TIME - 3_600,
        instructionName: 'Unknown',
        key: 'third-0',
        programId: PROGRAMS.unknown,
        signature: SIGNATURES.third,
    }),
];
