import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useCustomIdlToning } from '../use-custom-idl-toning';

function Card({ active }: { active: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useCustomIdlToning(ref, active);
    return (
        <div ref={ref} data-testid="card" style={{ backgroundColor: 'rgb(30, 36, 35)' }}>
            <div data-testid="head" style={{ backgroundColor: 'rgb(20, 24, 22)' }} />
            <div data-testid="input" style={{ backgroundColor: 'rgb(60, 66, 65)' }} />
            <span data-testid="badge" style={{ backgroundColor: 'rgb(22, 163, 74)' }} />
            <span data-testid="plain" />
            <span data-testid="label" style={{ color: 'rgb(122, 138, 131)' }} />
            <span data-testid="primary" style={{ color: 'rgb(255, 255, 255)' }} />
            <input data-testid="field" style={{ border: '1px solid rgb(40, 46, 45)' }} />
        </div>
    );
}

// `oklch(L C H)` → L.
const lightness = (testId: string) =>
    Number(screen.getByTestId(testId).style.backgroundColor.slice('oklch('.length).split(' ')[0]);

describe('useCustomIdlToning', () => {
    it('should tone the card ground to the row tint and keep lighter grounds lighter', () => {
        render(<Card active />);

        expect(lightness('card')).toBeCloseTo(0.215, 3);
        expect(screen.getByTestId('card').style.backgroundColor).toContain(' 0.018 92');
        expect(lightness('head')).toBeLessThan(lightness('card'));
        expect(lightness('input')).toBeGreaterThan(lightness('card'));
    });

    it('should leave coloured grounds and elements without a ground as they are', () => {
        render(<Card active />);

        expect(screen.getByTestId('badge').style.backgroundColor).toBe('rgb(22, 163, 74)');
        expect(screen.getByTestId('plain').style.backgroundColor).toBe('');
    });

    it('should restore every ground when it turns off', () => {
        const { rerender } = render(<Card active />);
        rerender(<Card active={false} />);

        expect(screen.getByTestId('card').style.backgroundColor).toBe('rgb(30, 36, 35)');
        expect(screen.getByTestId('input').style.backgroundColor).toBe('rgb(60, 66, 65)');
    });

    it('should tone grey text at its own lightness and leave the primary white text', () => {
        render(<Card active />);

        expect(screen.getByTestId('label').style.color).toContain(' 0.018 92');
        expect(screen.getByTestId('primary').style.color).toBe('rgb(255, 255, 255)');
    });

    it('should give fields a light edge and take it back when it turns off', () => {
        const { rerender } = render(<Card active />);
        expect(screen.getByTestId('field').style.borderTopColor).toBe('oklch(0.5 0.03 92)');

        rerender(<Card active={false} />);
        expect(screen.getByTestId('field').style.borderTopColor).toBe('rgb(40, 46, 45)');
    });
});
