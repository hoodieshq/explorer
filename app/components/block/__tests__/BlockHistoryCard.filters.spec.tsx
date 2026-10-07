import { gen } from '@__fixtures__/gen';
import { compileV0TransactionMessage } from '@__fixtures__/transaction-message';
import type { BlockData, BlockTransaction, BlockTransactionMeta } from '@entities/block-data';
import { fromCompiledMessage } from '@explorer/parsers/transaction';
import { AccountRole, type Address, address, type Base58EncodedBytes, blockhash, lamports } from '@solana/kit';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const PROGRAM_A = '11111111111111111111111111111111';
const PROGRAM_B = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ACCOUNT = 'Stake11111111111111111111111111111111111111';
const SIGNATURES = {
    failedProgramB: gen.signature(4),
    legacyProgramA: gen.signature(1),
    v0ProgramA: gen.signature(2),
    v0ProgramB: gen.signature(3),
};
const FEE_PAYER = address(gen.address(1));
const OUTER_PROGRAM = address(gen.address(2));
const LOOKUP_TABLE = address(gen.address(3));
const LOADED_WRITABLE = address(gen.address(4));
const LOADED_READONLY = address(gen.address(5));
const LOADED_READONLY_INDEX = 3;
let search = `version=0&filter=${PROGRAM_A}&accountFilter=${ACCOUNT}&sort=index&dir=desc&cluster=devnet`;

vi.mock('next/navigation', () => ({
    usePathname: () => '/block/123',
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@providers/cluster', () => ({
    useCluster: () => ({ cluster: 0 }),
}));

vi.mock('@components/common/Address', () => ({
    Address: ({ address }: { address: Address }) => <span>{address}</span>,
}));

vi.mock('@components/common/Signature', () => ({
    Signature: ({ signature }: { signature: string }) => <span>{signature}</span>,
}));

vi.mock('@components/common/SolBalance', () => ({
    SolBalance: ({ lamports }: { lamports: bigint }) => <span>{lamports.toString()}</span>,
}));

vi.mock('@utils/program-logs', () => ({
    parseProgramLogs: () => [{ computeUnits: 0, truncated: false }],
}));

import { BlockHistoryCard } from '../BlockHistoryCard';

describe('BlockHistoryCard filters', () => {
    beforeEach(() => {
        search = `version=0&filter=${PROGRAM_A}&accountFilter=${ACCOUNT}&sort=index&dir=desc&cluster=devnet`;
    });

    it('should combine version, program, and account filters while preserving URL parameters', () => {
        render(<BlockHistoryCard block={makeBlock()} epoch={500n} />);

        expect(screen.getAllByText(SIGNATURES.v0ProgramA)).toHaveLength(2);
        expect(screen.queryAllByText(SIGNATURES.legacyProgramA)).toHaveLength(0);
        expect(screen.queryAllByText(SIGNATURES.v0ProgramB)).toHaveLength(0);

        expect(screen.getByRole('link', { name: 'Clear version filter' })).toHaveAttribute(
            'href',
            `/block/123?filter=${PROGRAM_A}&accountFilter=${ACCOUNT}&sort=index&dir=desc&cluster=devnet`,
        );
        expect(screen.getByRole('link', { name: 'Clear program filter' })).toHaveAttribute(
            'href',
            `/block/123?version=0&filter=all&accountFilter=${ACCOUNT}&sort=index&dir=desc&cluster=devnet`,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
        expect(screen.getByRole('link', { name: 'v1 (0)' })).toHaveAttribute(
            'href',
            `/block/123?version=1&filter=${PROGRAM_A}&accountFilter=${ACCOUNT}&sort=index&dir=desc&cluster=devnet`,
        );
    });

    it('should hide failed transactions when status=succeeded and offer a chip to clear it', () => {
        search = `filter=all&status=succeeded&cluster=devnet`;
        render(<BlockHistoryCard block={makeBlock()} epoch={500n} />);

        expect(screen.getAllByText(SIGNATURES.v0ProgramA)).toHaveLength(2);
        expect(screen.queryAllByText(SIGNATURES.failedProgramB)).toHaveLength(0);
        expect(screen.getByText('3 filtered records')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Clear status filter' })).toHaveAttribute(
            'href',
            '/block/123?filter=all&cluster=devnet',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
        expect(screen.getByRole('link', { name: 'Failed' })).toHaveAttribute(
            'href',
            '/block/123?filter=all&status=failed&cluster=devnet',
        );
    });

    it('should show the generic empty message when a status filter matches nothing', () => {
        search = 'status=failed';
        render(<BlockHistoryCard block={makeBlock(false)} epoch={500n} />);
        expect(screen.getByText('No transactions found with this filter')).toBeInTheDocument();
    });

    it.each([
        ['filter=all', 2],
        ['filter=all&status=failed', 0],
        ['filter=all&status=succeeded', 0],
    ])('should show an unavailable transaction only without a status filter: %s', (query, expectedCount) => {
        search = query;
        render(<BlockHistoryCard block={makeBlockWithUnavailable()} epoch={500n} />);
        expect(screen.queryAllByText('Unavailable')).toHaveLength(expectedCount);
    });

    it('should keep the CUs Consumed column when an unavailable transaction is listed', () => {
        search = 'filter=all';
        render(<BlockHistoryCard block={makeBlockWithUnavailable()} epoch={500n} />);
        expect(screen.getAllByText('CUs Consumed').length).toBeGreaterThan(0);
    });
});

describe('BlockHistoryCard invoked programs', () => {
    it('should resolve an inner instruction program loaded from a lookup table', () => {
        search = '';
        render(<BlockHistoryCard block={makeBlockWithLookupTableProgram()} epoch={500n} />);

        expect(screen.getAllByText(OUTER_PROGRAM)).toHaveLength(2);
        expect(screen.getAllByText(LOADED_READONLY)).toHaveLength(2);
    });
});

function makeBlockWithUnavailable(): BlockData {
    const block = makeBlock();
    return { ...block, transactions: [...block.transactions, { index: block.transactions.length, unavailable: true }] };
}

function makeBlock(withFailed = true): BlockData {
    return {
        blockTime: null,
        blockhash: blockhash('11111111111111111111111111111111'),
        parentSlot: 122n,
        previousBlockhash: blockhash('11111111111111111111111111111111'),
        rewards: [],
        transactions: [
            makeTransaction(0, SIGNATURES.legacyProgramA, 'legacy', PROGRAM_A),
            makeTransaction(1, SIGNATURES.v0ProgramA, 0, PROGRAM_A),
            makeTransaction(2, SIGNATURES.v0ProgramB, 0, PROGRAM_B),
            ...(withFailed
                ? [
                      makeTransaction(3, SIGNATURES.failedProgramB, 0, PROGRAM_B, {
                          InstructionError: [0, { Custom: 1 }],
                      }),
                  ]
                : []),
        ],
    };
}

function makeTransaction(
    index: number,
    transactionSignature: string,
    version: 'legacy' | 0,
    program: string,
    err: BlockTransactionMeta['err'] = null,
): BlockTransaction {
    return {
        index,
        meta: {
            costUnits: 1n,
            err,
            fee: lamports(5_000n),
            innerInstructions: [],
            loadedAddresses: undefined,
            logMessages: [],
        },
        parsedTransaction: fromCompiledMessage(
            {
                header: { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 1 },
                instructions: [{ accountIndices: [1], data: new Uint8Array(), programAddressIndex: 0 }],
                lifetimeToken: blockhash('11111111111111111111111111111111'),
                staticAccounts: [address(program), address(ACCOUNT)],
                version,
            },
            { signatures: [transactionSignature] },
        ),
    };
}

function makeBlockWithLookupTableProgram(): BlockData {
    const message = compileV0TransactionMessage(FEE_PAYER, {
        accounts: [
            { address: LOADED_WRITABLE, addressIndex: 0, lookupTableAddress: LOOKUP_TABLE, role: AccountRole.WRITABLE },
            { address: LOADED_READONLY, addressIndex: 0, lookupTableAddress: LOOKUP_TABLE, role: AccountRole.READONLY },
        ],
        data: new Uint8Array([9]),
        programAddress: OUTER_PROGRAM,
    });

    return {
        blockTime: null,
        blockhash: blockhash('11111111111111111111111111111111'),
        parentSlot: 122n,
        previousBlockhash: blockhash('11111111111111111111111111111111'),
        rewards: [],
        transactions: [
            {
                index: 0,
                meta: {
                    costUnits: 1n,
                    err: null,
                    fee: lamports(5_000n),
                    innerInstructions: [
                        {
                            index: 0,
                            instructions: [
                                { accounts: [], data: '' as Base58EncodedBytes, programIdIndex: LOADED_READONLY_INDEX },
                            ],
                        },
                    ],
                    logMessages: [],
                },
                parsedTransaction: fromCompiledMessage(message, {
                    loadedAddresses: { readonly: [LOADED_READONLY], writable: [LOADED_WRITABLE] },
                    signatures: [gen.signature(5)],
                }),
            },
        ],
    };
}
