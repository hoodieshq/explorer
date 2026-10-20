import { DEFAULT_RPC_URL, gen } from '@__fixtures__/gen';
import { abbreviateAddress } from '@components/shared/address';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cluster } from '@/app/utils/cluster';

import {
    type InstructionFetchResult,
    InstructionIntentButton,
    InstructionIntentList,
    type InstructionIntentListEntry,
    InstructionIntentProvider,
    InstructionIntentRow,
} from '../..';
import {
    mintAccount,
    mintToInstruction,
    SYSTEM_PROGRAM_ADDRESS,
    SYSTEM_ROOT,
    TOKEN_PROGRAM_ADDRESS,
    TOKEN_ROOT,
    transferSolInstruction,
} from '../../mocks/fixtures';

const RPC = { name: 'rpc' };

type Parsers = typeof import('@codama/dynamic-parsers');
type Display = typeof import('@codama/dynamic-instructions');
type Loader = typeof import('../../lib/load-intent-sdk');

const mocks = vi.hoisted(() => ({
    fetchEncodedAccounts: vi.fn(),
    getInstructionDisplayFromParsedInstruction: vi.fn(),
    getRequiredAccountsForDisplay: vi.fn(),
    loadIntentSdk: vi.fn(),
    parseInstruction: vi.fn(),
    realGetDisplay: undefined as Display['getInstructionDisplayFromParsedInstruction'] | undefined,
    realGetRequiredAccounts: undefined as Display['getRequiredAccountsForDisplay'] | undefined,
    realLoadIntentSdk: undefined as Loader['loadIntentSdk'] | undefined,
    realParseInstruction: undefined as Parsers['parseInstruction'] | undefined,
    useProgramIdls: vi.fn(),
}));

vi.mock('@codama/dynamic-parsers', async importOriginal => {
    const actual = await importOriginal<Parsers>();
    mocks.realParseInstruction = actual.parseInstruction;
    return { ...actual, parseInstruction: mocks.parseInstruction };
});
vi.mock('@codama/dynamic-instructions', async importOriginal => {
    const actual = await importOriginal<Display>();
    mocks.realGetDisplay = actual.getInstructionDisplayFromParsedInstruction;
    mocks.realGetRequiredAccounts = actual.getRequiredAccountsForDisplay;
    return {
        ...actual,
        getInstructionDisplayFromParsedInstruction: mocks.getInstructionDisplayFromParsedInstruction,
        getRequiredAccountsForDisplay: mocks.getRequiredAccountsForDisplay,
    };
});
vi.mock('../../lib/load-intent-sdk', async importOriginal => {
    const actual = await importOriginal<Loader>();
    mocks.realLoadIntentSdk = actual.loadIntentSdk;
    return { ...actual, loadIntentSdk: mocks.loadIntentSdk };
});
vi.mock('@solana/kit', async importOriginal => ({
    ...(await importOriginal<typeof import('@solana/kit')>()),
    fetchEncodedAccounts: mocks.fetchEncodedAccounts,
}));
vi.mock('@entities/idl/@x/instruction-intent', async importOriginal => ({
    ...(await importOriginal<typeof import('@entities/idl/@x/instruction-intent')>()),
    useProgramIdls: mocks.useProgramIdls,
}));
vi.mock('@entities/cluster/@x/instruction-intent', () => ({
    useCluster: () => ({ cluster: Cluster.Devnet, url: DEFAULT_RPC_URL }),
    useSolanaRpc: () => RPC,
}));
vi.mock('../IntentSentence', () => ({
    IntentSentence: ({ parts }: { parts: readonly { text: string }[] }) => (
        <span data-testid="intent-sentence">{parts.map(part => part.text).join('')}</span>
    ),
}));

let cache = new Map();

function mintToEntry(amount?: bigint): InstructionIntentListEntry {
    return {
        ixFetchResult: { instruction: mintToInstruction(amount), status: 'success' },
        programId: TOKEN_PROGRAM_ADDRESS,
    };
}

function transferSolEntry(): InstructionIntentListEntry {
    return {
        ixFetchResult: { instruction: transferSolInstruction(), status: 'success' },
        programId: SYSTEM_PROGRAM_ADDRESS,
    };
}

function mockIdlsByProgram() {
    mocks.useProgramIdls.mockImplementation((programId: string) => {
        if (programId === SYSTEM_PROGRAM_ADDRESS) return { isLoading: false, programMetadataIdl: SYSTEM_ROOT };
        if (programId === TOKEN_PROGRAM_ADDRESS) return { isLoading: false, programMetadataIdl: TOKEN_ROOT };
        return { isLoading: false };
    });
}

function anchorIdl(name: string) {
    return {
        address: gen.address(1),
        instructions: [],
        metadata: { name, spec: '0.1.0', version: '0.1.0' },
    };
}

function renderList(entries: readonly InstructionIntentListEntry[]) {
    return render(
        <SWRConfig value={{ provider: () => cache }}>
            <InstructionIntentList instructions={entries} />
        </SWRConfig>,
    );
}

function renderCardAndList(entry: InstructionIntentListEntry) {
    return render(
        <SWRConfig value={{ provider: () => cache }}>
            <InstructionIntentProvider programId={entry.programId} ixFetchResult={entry.ixFetchResult}>
                <InstructionIntentButton />
                <table>
                    <tbody>
                        <InstructionIntentRow />
                    </tbody>
                </table>
            </InstructionIntentProvider>
            <InstructionIntentList instructions={[entry]} />
        </SWRConfig>,
    );
}

async function openList() {
    await userEvent.click(screen.getByTestId('instruction-intent-list-toggle'));
}

async function openCard() {
    await userEvent.click(screen.getByTestId('instruction-intent-trigger'));
}

beforeEach(() => {
    vi.clearAllMocks();
    cache = new Map();
    mocks.parseInstruction.mockImplementation((...args: Parameters<Parsers['parseInstruction']>) =>
        mocks.realParseInstruction?.(...args),
    );
    mocks.getInstructionDisplayFromParsedInstruction.mockImplementation(
        (...args: Parameters<Display['getInstructionDisplayFromParsedInstruction']>) => mocks.realGetDisplay?.(...args),
    );
    mocks.getRequiredAccountsForDisplay.mockImplementation(
        (...args: Parameters<Display['getRequiredAccountsForDisplay']>) => mocks.realGetRequiredAccounts?.(...args),
    );
    mocks.loadIntentSdk.mockImplementation(() => mocks.realLoadIntentSdk?.());
    mocks.fetchEncodedAccounts.mockResolvedValue([mintAccount(6)]);
    mockIdlsByProgram();
});

describe('InstructionIntentList', () => {
    it('should render nothing when the list has no instructions', () => {
        renderList([]);

        expect(screen.queryByTestId('instruction-intent-list')).not.toBeInTheDocument();
    });

    it('should link each row to its card anchor', async () => {
        renderList([transferSolEntry(), mintToEntry()]);

        await openList();

        expect(screen.getByRole('link', { name: '#1' })).toHaveAttribute('href', '#ix-1');
        expect(screen.getByRole('link', { name: '#2' })).toHaveAttribute('href', '#ix-2');
    });

    it('should show the instruction count when collapsed', () => {
        renderList([transferSolEntry(), mintToEntry()]);

        expect(screen.getByTestId('instruction-intent-list-count')).toHaveTextContent('2 instructions');
    });

    it('should not read accounts or load the SDK while collapsed', async () => {
        renderList([mintToEntry()]);

        await act(() => new Promise(resolve => setTimeout(resolve, 0)));

        expect(mocks.fetchEncodedAccounts).not.toHaveBeenCalled();
        expect(mocks.loadIntentSdk).not.toHaveBeenCalled();

        await openList();

        await waitFor(() => expect(mocks.loadIntentSdk).toHaveBeenCalled());
        await waitFor(() => expect(mocks.fetchEncodedAccounts).toHaveBeenCalled());
    });

    it('should compute every row once when opened', async () => {
        renderList([transferSolEntry(), mintToEntry()]);

        await openList();

        await waitFor(() => expect(screen.getAllByTestId('intent-sentence')).toHaveLength(2));
        expect(mocks.getInstructionDisplayFromParsedInstruction).toHaveBeenCalledTimes(2);
    });

    it('should share one computation and one account read with an open card', async () => {
        renderCardAndList(mintToEntry());

        await openCard();
        await openList();

        await waitFor(() => expect(screen.getAllByTestId('intent-sentence')).toHaveLength(2));
        expect(mocks.fetchEncodedAccounts).toHaveBeenCalledTimes(1);
        expect(mocks.getInstructionDisplayFromParsedInstruction).toHaveBeenCalledTimes(1);
    });

    it('should recover the card when a row retries a failed account read', async () => {
        mocks.fetchEncodedAccounts.mockRejectedValueOnce(new Error('429')).mockResolvedValueOnce([mintAccount(6)]);
        renderCardAndList(mintToEntry());

        await openCard();
        await openList();
        await userEvent.click(await screen.findByTestId('instruction-intent-list-item-retry'));

        const panel = screen.getByTestId('instruction-intent-panel');
        await waitFor(() => expect(within(panel).getByTestId('intent-sentence')).toBeInTheDocument());
    });

    it('should read cached results when the list remounts', async () => {
        const entries = [mintToEntry()];
        const { unmount } = renderList(entries);
        await openList();
        expect(await screen.findByTestId('intent-sentence')).toBeInTheDocument();
        unmount();

        renderList(entries);
        await openList();

        expect(await screen.findByTestId('intent-sentence')).toBeInTheDocument();
        expect(mocks.getInstructionDisplayFromParsedInstruction).toHaveBeenCalledTimes(1);
    });

    it('should show the failure text without Retry when the instruction fetch failed', async () => {
        const ixFetchResult: InstructionFetchResult = { status: 'failed' };
        renderList([{ ixFetchResult, programId: SYSTEM_PROGRAM_ADDRESS }]);

        await openList();

        expect(screen.getByTestId('instruction-intent-list-item-failed')).toBeInTheDocument();
        expect(screen.queryByTestId('instruction-intent-list-item-retry')).not.toBeInTheDocument();
    });

    it('should name a known program in an unavailable row', async () => {
        mocks.useProgramIdls.mockReturnValue({ isLoading: false });
        renderList([transferSolEntry()]);

        await openList();

        expect(screen.getByTestId('instruction-intent-list-item-unavailable')).toHaveTextContent(
            'System Program · intent unavailable',
        );
    });

    it('should shorten the address of an unknown program', async () => {
        const programId = gen.address(9);
        mocks.useProgramIdls.mockReturnValue({ isLoading: false });
        renderList([{ ...transferSolEntry(), programId }]);

        await openList();

        expect(screen.getByTestId('instruction-intent-list-item-unavailable')).toHaveTextContent(
            `Unknown Program (${abbreviateAddress(programId, { head: 5, tail: 5 })}) · intent unavailable`,
        );
    });

    it('should name an unlabeled program by its IDL', async () => {
        const programId = gen.address(9);
        mocks.useProgramIdls.mockReturnValue({ anchorIdl: anchorIdl('raydium_cp_swap'), isLoading: false });
        renderList([{ ...transferSolEntry(), programId }]);

        await openList();

        expect(screen.getByTestId('instruction-intent-list-item-unavailable')).toHaveTextContent(
            'Raydium Cp Swap · intent unavailable',
        );
    });

    it('should prefer the program label over the IDL name', async () => {
        mocks.useProgramIdls.mockReturnValue({ anchorIdl: anchorIdl('other_program'), isLoading: false });
        renderList([transferSolEntry()]);

        await openList();

        expect(screen.getByTestId('instruction-intent-list-item-unavailable')).toHaveTextContent(
            'System Program · intent unavailable',
        );
    });
});
