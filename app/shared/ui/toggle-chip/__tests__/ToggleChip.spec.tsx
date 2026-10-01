import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToggleChip } from '../ToggleChip';

describe('ToggleChip', () => {
    it('should render the outline chip, not pressed, when inactive', () => {
        render(<ToggleChip>RAW</ToggleChip>);

        const chip = screen.getByRole('button', { name: 'RAW' });
        expect(chip).toHaveAttribute('aria-pressed', 'false');
        expect(chip).not.toHaveClass('!border-accent');
    });

    it('should switch to the pressed, accent-bordered chip when active flips on', () => {
        const { rerender } = render(<ToggleChip active={false}>Parsed</ToggleChip>);

        rerender(<ToggleChip active>Parsed</ToggleChip>);

        const chip = screen.getByRole('button', { name: 'Parsed' });
        expect(chip).toHaveAttribute('aria-pressed', 'true');
        expect(chip).toHaveClass('!border-accent');
    });

    it('should keep caller classes and hand clicks to the caller', async () => {
        const onClick = vi.fn();
        render(
            <ToggleChip active className="shrink-0" onClick={onClick}>
                RAW
            </ToggleChip>,
        );

        const chip = screen.getByRole('button', { name: 'RAW' });
        expect(chip).toHaveClass('shrink-0', '!border-accent');
        await userEvent.click(chip);
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
