import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodamaInstructionCard } from '../CodamaInstructionCard';
import { IdlInstructionCard } from '../IdlInstructionCard';

vi.mock('../CodamaInstructionCard', () => ({
    CodamaInstructionCard: vi.fn(() => <div data-testid="codama-card" />),
}));
vi.mock('../AnchorDetailsCard', () => ({
    AnchorDetailsCard: ({ signature, notice }: { signature: string; notice?: React.ReactNode }) => (
        <div data-testid="anchor-card">
            {signature}
            {notice}
        </div>
    ),
}));
vi.mock('../IdlDecodeFailureNotice', () => ({
    IdlDecodeFailureNotice: () => <span>failure-notice</span>,
}));
vi.mock('@/app/components/instruction/UnknownDetailsCard', () => ({
    UnknownDetailsCard: ({ notice }: { notice?: React.ReactNode }) => <div data-testid="unknown-card">{notice}</div>,
}));

const ix = new TransactionInstruction({ data: Buffer.from([1]), keys: [], programId: PublicKey.unique() });
const props = { childIndex: undefined, index: 0, innerCards: undefined, ix, result: { err: null }, signature: 'SIG' };

describe('IdlInstructionCard', () => {
    afterEach(() => {
        vi.mocked(CodamaInstructionCard).mockReset();
        vi.restoreAllMocks();
    });

    it('should render the Codama card for a codama decode', () => {
        render(
            <IdlInstructionCard
                {...props}
                decoded={{ kind: 'codama', parsedIx: { accounts: [], path: [] } as never }}
            />,
        );
        expect(screen.getByTestId('codama-card')).toBeInTheDocument();
    });

    it('should render the Anchor card and forward the signature for an anchor decode', () => {
        render(
            <IdlInstructionCard {...props} decoded={{ details: {} as never, kind: 'anchor', program: {} as never }} />,
        );
        expect(screen.getByTestId('anchor-card')).toHaveTextContent('SIG');
    });

    it('should render the Unknown card when the decoded card throws', () => {
        const failure = new Error('decode failed');
        vi.mocked(CodamaInstructionCard).mockImplementation(() => {
            throw failure;
        });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        render(
            <IdlInstructionCard
                {...props}
                decoded={{ kind: 'codama', parsedIx: { accounts: [], path: [] } as never }}
            />,
        );

        expect(screen.getByTestId('unknown-card')).toBeInTheDocument();
    });

    it('should render the Unknown card for an unknown decode', () => {
        render(<IdlInstructionCard {...props} decoded={{ kind: 'unknown' }} />);
        expect(screen.getByTestId('unknown-card')).toBeInTheDocument();
    });

    it('should explain a failed decode inside the card', () => {
        render(<IdlInstructionCard {...props} decoded={{ isCustomIdl: true, kind: 'unknown' }} />);
        // Inside the card, not above it.
        expect(screen.getByTestId('unknown-card')).toHaveTextContent('failure-notice');
    });

    it('should explain inside the Anchor card when no instruction in the IDL matches', () => {
        render(
            <IdlInstructionCard
                {...props}
                decoded={{
                    details: { decodedIxData: undefined } as never,
                    isCustomIdl: true,
                    kind: 'anchor',
                    program: {} as never,
                }}
            />,
        );
        expect(screen.getByTestId('anchor-card')).toHaveTextContent('failure-notice');
    });

    it('should render a successful custom IDL decode without a failure note', () => {
        render(
            <IdlInstructionCard
                {...props}
                decoded={{
                    details: { decodedIxData: { data: {}, name: 'vote' }, ixAccounts: [], ixDef: {} } as never,
                    isCustomIdl: true,
                    kind: 'anchor',
                    program: {} as never,
                }}
            />,
        );
        expect(screen.getByTestId('anchor-card')).not.toHaveTextContent('failure-notice');
    });

    it('should explain an on-chain IDL decode failure inside the card too', () => {
        render(<IdlInstructionCard {...props} decoded={{ isCustomIdl: false, kind: 'unknown' }} />);
        expect(screen.getByTestId('unknown-card')).toHaveTextContent('failure-notice');
    });
});
