import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InstructionDisplayPopover } from '../InstructionDisplayPopover';

const hookState = {
    display: undefined as InstructionDisplay | undefined,
    hasDisplay: true,
    isLoading: false,
};

vi.mock('../../model/use-instruction-display-from-raw', () => ({
    useInstructionDisplayFromRaw: () => hookState,
}));

const raw = new TransactionInstruction({ data: Buffer.from([2]), keys: [], programId: PublicKey.unique() });
const programId = raw.programId.toBase58();

const DISPLAY: InstructionDisplay = {
    fields: [{ label: 'Amount', value: '1.5 SOL' }],
    intent: 'Transfer SOL',
    interpolatedIntent: 'Transfer 1.5 SOL to Alice',
};

function renderPopover(props: Partial<React.ComponentProps<typeof InstructionDisplayPopover>> = {}) {
    return render(<InstructionDisplayPopover raw={raw} programId={programId} {...props} />);
}

beforeEach(() => {
    hookState.display = undefined;
    hookState.hasDisplay = true;
    hookState.isLoading = false;
});

describe('InstructionDisplayPopover', () => {
    it('should render nothing for a program whose IDL publishes no display', () => {
        hookState.hasDisplay = false;

        const { container } = renderPopover();

        expect(container).toBeEmptyDOMElement();
    });

    it('should render the trigger for a program whose IDL publishes a display', () => {
        renderPopover();

        expect(screen.getByTestId('instruction-display-trigger')).toBeInTheDocument();
    });

    it('should show the intent sentence once the trigger is clicked', () => {
        hookState.display = DISPLAY;

        renderPopover();
        fireEvent.click(screen.getByTestId('instruction-display-trigger'));

        expect(screen.getByTestId('instruction-display-popover')).toBeInTheDocument();
        expect(screen.getByTestId('instruction-display-intent')).toHaveTextContent('Transfer 1.5 SOL to Alice');
    });

    it('should show the loading state while the display resolves', () => {
        hookState.isLoading = true;

        renderPopover();
        fireEvent.click(screen.getByTestId('instruction-display-trigger'));

        expect(screen.getByTestId('instruction-display-loading')).toBeInTheDocument();
    });

    it('should report that no summary is available once resolution settles empty', () => {
        renderPopover();
        fireEvent.click(screen.getByTestId('instruction-display-trigger'));

        expect(screen.getByText('No summary available for this instruction.')).toBeInTheDocument();
    });

    it('should request the raw instruction on first open when it is missing', () => {
        const onRequestRaw = vi.fn();

        renderPopover({ onRequestRaw, raw: undefined });
        fireEvent.click(screen.getByTestId('instruction-display-trigger'));

        expect(onRequestRaw).toHaveBeenCalledTimes(1);
    });

    it('should not request the raw instruction when it is already present', () => {
        const onRequestRaw = vi.fn();

        renderPopover({ onRequestRaw });
        fireEvent.click(screen.getByTestId('instruction-display-trigger'));

        expect(onRequestRaw).not.toHaveBeenCalled();
    });
});
