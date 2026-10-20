import {
    mintToInstruction,
    TOKEN_PROGRAM_ADDRESS,
    transferSolInstruction,
} from '@entities/instruction-intent/mocks/fixtures';
import type { KitInstruction } from '@explorer/parsers';
import { FetchStatus } from '@providers/cache';
import { describe, expect, it } from 'vitest';

import { toInstructionFetchResult } from '../to-instruction-fetch-result';

function getSecondCardFetchResult(fetchStatus: FetchStatus | undefined, instructions?: readonly KitInstruction[]) {
    return toInstructionFetchResult({ fetchStatus, index: 1, instructions, programId: TOKEN_PROGRAM_ADDRESS });
}

describe('toInstructionFetchResult', () => {
    it('should report loading when the raw transaction is not requested', () => {
        expect(getSecondCardFetchResult(undefined)).toEqual({ status: 'loading' });
    });

    it('should report loading when the raw transaction is loading', () => {
        expect(getSecondCardFetchResult(FetchStatus.Fetching)).toEqual({ status: 'loading' });
    });

    it('should report success with the instruction at the card index when the raw transaction is fetched', () => {
        const second = mintToInstruction();

        expect(getSecondCardFetchResult(FetchStatus.Fetched, [transferSolInstruction(), second])).toEqual({
            instruction: second,
            status: 'success',
        });
    });

    it('should report failed when the instruction at the card index belongs to another program', () => {
        expect(
            getSecondCardFetchResult(FetchStatus.Fetched, [transferSolInstruction(), transferSolInstruction()]),
        ).toEqual({ status: 'failed' });
    });

    it('should report failed when the raw fetch fails', () => {
        expect(getSecondCardFetchResult(FetchStatus.FetchFailed)).toEqual({ status: 'failed' });
    });

    it('should report failed when the fetched transaction has no decodable instructions', () => {
        expect(getSecondCardFetchResult(FetchStatus.Fetched)).toEqual({ status: 'failed' });
    });
});
