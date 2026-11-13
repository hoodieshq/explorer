import { FetchStatus } from '@providers/cache';
import { type PartiallyDecodedInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { MOCK_RAW_TX, TOKEN_ACCOUNT } from '../../ui/__fixtures__/transaction';
import { toIntentListEntries } from '../intent-list-entries';

const RAW = MOCK_RAW_TX.data?.raw;
const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();

describe('toIntentListEntries', () => {
    it('should report loading when the raw transaction is not requested', () => {
        expect(
            toIntentListEntries({ parsedInstructions: [systemIx()], raw: undefined, rawFetchStatus: undefined }),
        ).toEqual([{ ixFetchResult: { status: 'loading' }, programId: SYSTEM_PROGRAM_ID }]);
    });

    it('should report loading when the raw transaction is loading', () => {
        const [entry] = toIntentListEntries({
            parsedInstructions: [systemIx()],
            raw: undefined,
            rawFetchStatus: FetchStatus.Fetching,
        });

        expect(entry.ixFetchResult).toEqual({ status: 'loading' });
    });

    it('should report success with the raw instruction at the same index when the raw transaction is fetched', () => {
        const [entry] = toIntentListEntries({
            parsedInstructions: [systemIx()],
            raw: RAW,
            rawFetchStatus: FetchStatus.Fetched,
        });

        expect(entry.ixFetchResult).toMatchObject({
            instruction: { programAddress: SYSTEM_PROGRAM_ID },
            status: 'success',
        });
    });

    it('should report failed when the raw instruction at the same index belongs to another program', () => {
        const [entry] = toIntentListEntries({
            parsedInstructions: [partiallyDecoded(TOKEN_ACCOUNT)],
            raw: RAW,
            rawFetchStatus: FetchStatus.Fetched,
        });

        expect(entry).toEqual({ ixFetchResult: { status: 'failed' }, programId: TOKEN_ACCOUNT.toBase58() });
    });

    it('should report failed when the raw fetch fails', () => {
        const [entry] = toIntentListEntries({
            parsedInstructions: [systemIx()],
            raw: undefined,
            rawFetchStatus: FetchStatus.FetchFailed,
        });

        expect(entry.ixFetchResult).toEqual({ status: 'failed' });
    });

    it('should report failed when the fetched transaction has no raw data', () => {
        const [entry] = toIntentListEntries({
            parsedInstructions: [systemIx()],
            raw: null,
            rawFetchStatus: FetchStatus.Fetched,
        });

        expect(entry.ixFetchResult).toEqual({ status: 'failed' });
    });
});

function systemIx(): PartiallyDecodedInstruction {
    return partiallyDecoded(SystemProgram.programId);
}

function partiallyDecoded(programId: PublicKey): PartiallyDecodedInstruction {
    return { accounts: [], data: '', programId };
}
