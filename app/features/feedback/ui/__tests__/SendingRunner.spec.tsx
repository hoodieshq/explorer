import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SendingRunner } from '../SendingRunner';

describe('SendingRunner', () => {
    beforeEach(() => {
        // jsdom lays nothing out; give the parent a 100 × 40 box.
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should run a dash a quarter of the outline long round the parent, outside its edge', () => {
        render(
            <div className="relative">
                <SendingRunner gap={3} radius={4} />
            </div>,
        );

        const rect = screen.getByTestId('sending-runner-dash');
        // 3px out all round, less the 2px stroke: 104 × 44, its 4px corners grown by the gap and less half the stroke.
        expect(rect).toHaveAttribute('width', '104');
        expect(rect).toHaveAttribute('height', '44');
        expect(rect).toHaveAttribute('rx', '6');
        const perimeter = 2 * (104 - 12) + 2 * (44 - 12) + 2 * Math.PI * 6;
        const [dash, gap] = (rect.getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
        expect(dash).toBeCloseTo(perimeter * 0.25);
        expect(dash + gap).toBeCloseTo(perimeter);
    });
});
