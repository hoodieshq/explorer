import { gen } from '@__fixtures__/gen';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { InspectorInstructionCard } from '../InspectorInstructionCard';

const PROGRAM_ID = new PublicKey(gen.address(1));

vi.mock('@providers/scroll-anchor', () => ({
    useScrollAnchor: () => undefined,
}));

vi.mock('@entities/instruction-card', () => ({
    ProgramField: () => undefined,
}));

vi.mock('@features/decode-instruction-with-idl/ui/InstructionDisplayPopover', () => ({
    InstructionDisplayPopover: ({ programId, raw }: { programId: string; raw?: TransactionInstruction }) => (
        <div data-testid="display-popover" data-program-id={programId} data-has-raw={raw !== undefined} />
    ),
}));

function instruction() {
    return new TransactionInstruction({ data: Buffer.from([1]), keys: [], programId: PROGRAM_ID });
}

function renderCard(props: Partial<React.ComponentProps<typeof InspectorInstructionCard>> = {}) {
    return render(
        <InspectorInstructionCard title="Transfer" result={{ err: null }} index={0} ix={instruction()} {...props} />,
    );
}

describe('InspectorInstructionCard', () => {
    it('should offer the display summary on a top-level instruction', () => {
        renderCard();

        expect(screen.getByTestId('display-popover').dataset.programId).toBe(PROGRAM_ID.toString());
    });

    it('should not offer the display summary on an inner instruction', () => {
        renderCard({ childIndex: 0 });

        expect(screen.queryByTestId('display-popover')).not.toBeInTheDocument();
    });

    it('should treat the rendered instruction as the raw one when no raw prop arrives', () => {
        renderCard();

        expect(screen.getByTestId('display-popover').dataset.hasRaw).toBe('true');
    });

    it('should prefer an explicit raw instruction over the rendered one', () => {
        renderCard({ raw: instruction() });

        expect(screen.getByTestId('display-popover').dataset.hasRaw).toBe('true');
    });

    it('should withhold a raw instruction for an RPC-pre-parsed one', () => {
        const parsed = {
            parsed: { info: {}, type: 'transfer' },
            program: 'system',
            programId: PROGRAM_ID,
        } as unknown as React.ComponentProps<typeof InspectorInstructionCard>['ix'];

        renderCard({ ix: parsed });

        expect(screen.getByTestId('display-popover').dataset.hasRaw).toBe('false');
    });
});
