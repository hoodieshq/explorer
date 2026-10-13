import { render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { InstructionParserProvider } from '@/app/entities/instruction-parser';
import {
    createV1TransactionBytes,
    type V1ConfigOverrides,
} from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import { toBase64 } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';
import { instructionParserDispatcher } from '@/app/tx/instruction-parser-dispatcher';

import { ADDRESS_TABLE_LOOKUPS_CARD_TITLE } from '../AddressTableLookupsCard';
import { TransactionInspectorPage } from '../InspectorPage';

function rowValue(label: string): string | null | undefined {
    return screen.getByText(label).nextElementSibling?.textContent;
}

async function mockMessageParam(config: V1ConfigOverrides): Promise<void> {
    const { messageBytes } = parseTransactionBytes(createV1TransactionBytes(config));
    await mockMessageBytesParam(messageBytes);
}

async function mockMessageBytesParam(messageBytes: Uint8Array): Promise<void> {
    const params = new URLSearchParams();
    params.set('message', encodeURIComponent(toBase64(messageBytes)));

    vi.spyOn(await import('next/navigation'), 'useSearchParams').mockReturnValue(
        params as unknown as ReturnType<typeof useSearchParams>,
    );
}

function renderInspector() {
    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <AccountsProvider>
                    <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                        <TransactionInspectorPage showTokenBalanceChanges={false} />
                    </InstructionParserProvider>
                </AccountsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(() => '/tx/inspector'),
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
}));

// LoadedView owns the simulation and builds a Connection eagerly; stub the hook so this overview-only
// test doesn't need a live cluster URL. Idle status keeps the token-balance rows and gated tabs off.
vi.mock('@/app/features/instruction-simulation/model/use-simulation', () => ({
    useSimulation: () => ({ simulate: vi.fn(), status: 'idle' }),
}));

describe('TransactionInspectorPage with a v1 ?message= param', () => {
    beforeEach(async () => {
        vi.spyOn(await import('next/navigation'), 'useRouter').mockReturnValue({
            push: vi.fn(),
            replace: vi.fn(),
        } as unknown as ReturnType<typeof useRouter>);

        global.fetch = vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(JSON.stringify({}), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 200,
                }),
            ),
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should render the transaction with its resource-limit rows', async () => {
        await mockMessageParam({ computeUnitLimit: 300_000, priorityFeeLamports: 50n });
        renderInspector();

        expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.queryByText('Inspector Input')).toBeNull();
        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.getByText('Compute unit limit')).toBeInTheDocument();
        expect(screen.getByText('300,000')).toBeInTheDocument();
        expect(screen.getByText('Priority fee (total)')).toBeInTheDocument();
        expect(rowValue('Loaded accounts data size limit')).toBe('0');
        expect(rowValue('Heap size')).toBe('32,768');
        // fee payer, recipient, program — the Account List title no longer carries the account count.
        expect(screen.getByText('Account List')).toBeInTheDocument();
        // v1 messages carry static accounts only, so neither the lookups card nor the
        // lookup-derived account badges appear.
        expect(screen.queryByText(ADDRESS_TABLE_LOOKUPS_CARD_TITLE)).toBeNull();
        expect(screen.queryByText('Address Table Lookup')).toBeNull();
    });

    test('should render the overview and an instructions error when the v1 header is invalid', async () => {
        vi.spyOn(Logger, 'warn').mockImplementation(() => {});
        const { messageBytes } = parseTransactionBytes(createV1TransactionBytes({}));
        messageBytes[2] = 1;
        await mockMessageBytesParam(messageBytes);
        renderInspector();

        expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.queryByText('Compute unit limit')).toBeNull();
        expect(
            await screen.findByText('Failed to decode the instructions: Message header is invalid'),
        ).toBeInTheDocument();
    });
});
