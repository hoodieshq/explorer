import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EasingCurveEditor } from '../EasingCurveEditor';

describe('EasingCurveEditor', () => {
    it('should apply four typed numbers on Enter, keeping time within 0..1', async () => {
        const onChange = vi.fn();
        render(<EasingCurveEditor value={[0.25, 0.1, 0.25, 1]} onChange={onChange} />);

        const field = screen.getByRole('textbox', { name: 'Cubic bezier' });
        await userEvent.clear(field);
        await userEvent.type(field, 'cubic-bezier(1.5, 1.2, 0.3, -0.2){Enter}');

        expect(onChange).toHaveBeenLastCalledWith([1, 1.2, 0.3, -0.2]);
    });

    it('should put back the current value when the text is not four numbers', async () => {
        const onChange = vi.fn();
        render(<EasingCurveEditor value={[0.25, 0.1, 0.25, 1]} onChange={onChange} />);

        const field = screen.getByRole('textbox', { name: 'Cubic bezier' });
        await userEvent.clear(field);
        await userEvent.type(field, '0.1, nope{Enter}');

        expect(onChange).not.toHaveBeenCalled();
        expect(field).toHaveValue('0.25, 0.1, 0.25, 1');
    });

    it('should apply a preset', async () => {
        const onChange = vi.fn();
        render(<EasingCurveEditor value={[0.25, 0.1, 0.25, 1]} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'ease-in' }));

        expect(onChange).toHaveBeenCalledWith([0.42, 0, 1, 1]);
    });
});
