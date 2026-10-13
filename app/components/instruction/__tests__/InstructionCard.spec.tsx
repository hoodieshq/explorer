import { gen } from '@__fixtures__/gen';
import { FetchStatus } from '@providers/cache';
import { PublicKey, TransactionInstruction, TransactionMessage, VersionedMessage } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createV1TransactionBytes } from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

import { InstructionCard } from '../InstructionCard';
import { SignatureContext } from '../SignatureContext';

const SIGNATURE = gen.signature(1);
const PROGRAM_ID = new PublicKey(gen.address(1));

const fetchRaw = vi.fn();
let rawDetails: { data?: { raw?: unknown }; status: FetchStatus } | undefined;

vi.mock('@providers/transactions/raw', () => ({
    useFetchRawTransaction: () => fetchRaw,
    useRawTransactionDetails: () => rawDetails,
}));

vi.mock('@components/common/BaseInstructionCard', () => ({
    BaseInstructionCard: ({ onRequestRaw, raw }: { onRequestRaw?: () => void; raw?: unknown }) => (
        <button
            data-can-request={onRequestRaw !== undefined}
            data-has-raw={raw !== undefined}
            onClick={() => onRequestRaw?.()}
        >
            Raw
        </button>
    ),
}));

function renderCard(props: Partial<React.ComponentProps<typeof InstructionCard>> = {}) {
    const instruction = new TransactionInstruction({ data: Buffer.from([1]), keys: [], programId: PROGRAM_ID });

    return render(
        <SignatureContext.Provider value={SIGNATURE}>
            <InstructionCard title="Transfer" result={{ err: null }} index={0} ix={instruction} {...props} />
        </SignatureContext.Provider>,
    );
}

function legacyRawDetails() {
    const instruction = new TransactionInstruction({ data: Buffer.from([1]), keys: [], programId: PROGRAM_ID });

    return {
        data: { raw: { transaction: { instructions: [instruction] } } },
        status: FetchStatus.Fetched,
    };
}

function v1RawDetails() {
    const { messageBytes } = parseTransactionBytes(createV1TransactionBytes({}));

    return {
        data: { raw: { transaction: TransactionMessage.decompile(VersionedMessage.deserialize(messageBytes)) } },
        status: FetchStatus.Fetched,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    rawDetails = undefined;
});

describe('InstructionCard', () => {
    it('should request raw data the first time the Raw view is opened', async () => {
        renderCard();

        await userEvent.click(screen.getByRole('button'));

        expect(fetchRaw).toHaveBeenCalledWith(SIGNATURE);
    });

    it('should pass a fetched v1 instruction to the card', () => {
        rawDetails = v1RawDetails();

        renderCard();

        expect(screen.getByRole('button').dataset.hasRaw).toBe('true');
    });

    it('should stop requesting raw data once the instruction is available', () => {
        rawDetails = legacyRawDetails();

        renderCard();

        expect(screen.getByRole('button').dataset.canRequest).toBe('false');
    });

    it('should allow a retry after a failed fetch', async () => {
        rawDetails = { status: FetchStatus.FetchFailed };

        renderCard();
        await userEvent.click(screen.getByRole('button'));

        expect(fetchRaw).toHaveBeenCalledWith(SIGNATURE);
    });

    it('should not request raw data for an instruction supplied by the inspector', () => {
        const raw = new TransactionInstruction({ data: Buffer.from([1]), keys: [], programId: PROGRAM_ID });

        renderCard({ raw });

        expect(screen.getByRole('button').dataset.canRequest).toBe('false');
    });

    it('should stop requesting raw data for an inner instruction once a fetch has arrived', () => {
        rawDetails = legacyRawDetails();

        renderCard({ childIndex: 0 });

        expect(screen.getByRole('button').dataset.canRequest).toBe('false');
    });
});
