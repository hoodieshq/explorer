import { toKitInstruction } from '@explorer/parsers/compat';
import { MessageV0, TransactionMessage } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { toIntentListEntries } from '../intent-list-entries';
import type { DecodedMessageResult } from '../use-decoded-message';
import { buildMessage } from './__fixtures__/create-idempotent-tx';
import { buildLookupMessage, lookupTable } from './__fixtures__/lookup-message';

describe('toIntentListEntries', () => {
    it('should report loading rows while the lookup tables load', () => {
        const message = buildLookupMessage();

        const entries = toIntentListEntries(message, { status: 'loading' });

        expect(entries).toEqual([
            { ixFetchResult: { status: 'loading' }, programId: message.staticAccountKeys[1].toBase58() },
        ]);
    });

    it('should report failed rows when a lookup table fails', () => {
        const message = buildMessage();

        const entries = toIntentListEntries(message, { failedLookupIndex: 0, status: 'failed' });

        expect(entries).toHaveLength(message.compiledInstructions.length);
        expect(entries.map(entry => entry.ixFetchResult)).toEqual([{ status: 'failed' }]);
    });

    it('should pass the decoded instruction when the message is decoded', () => {
        const message = buildLookupMessage();
        const decodedMessage = readyResult(message);
        if (decodedMessage.status !== 'ready') throw new Error('expected a ready result');

        const entries = toIntentListEntries(message, decodedMessage);

        expect(entries).toEqual([
            {
                ixFetchResult: { instruction: decodedMessage.decoded.kitInstructions[0], status: 'success' },
                programId: message.staticAccountKeys[1].toBase58(),
            },
        ]);
    });

    it('should return no entries when a program index is outside the static keys', () => {
        const message = buildMessage();
        const outOfRange = new MessageV0({
            ...message,
            compiledInstructions: [
                ...message.compiledInstructions,
                { accountKeyIndexes: [], data: new Uint8Array(), programIdIndex: message.staticAccountKeys.length },
            ],
        });

        expect(toIntentListEntries(outOfRange, { status: 'loading' })).toEqual([]);
    });
});

function readyResult(message: MessageV0): DecodedMessageResult {
    const addressLookupTableAccounts = [lookupTable()];
    const instructions = TransactionMessage.decompile(message, { addressLookupTableAccounts }).instructions;
    return {
        decoded: {
            innerIxByIndex: undefined,
            instructions,
            kitInnerIxByIndex: new Map(),
            kitInstructions: instructions.map(toKitInstruction),
        },
        status: 'ready',
    };
}
