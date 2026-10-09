import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
    type CustomIdlHighlightVariant,
    customIdlHighlightVariantAtom,
} from '../../model/custom-idl/highlight-variant';
import { CustomIdlMark } from '../CustomIdlMark';

function renderWithVariant(variant: CustomIdlHighlightVariant, ui: ReactNode) {
    const store = createStore();
    store.set(customIdlHighlightVariantAtom, variant);
    const view = render(<Provider store={store}>{ui}</Provider>);
    return { rerender: (next: ReactNode) => view.rerender(<Provider store={store}>{next}</Provider>) };
}

function inRow(children: ReactNode) {
    return (
        <table>
            <tbody>
                <tr data-testid="row">
                    <td data-testid="first-cell">{children}</td>
                    <td data-testid="last-cell" />
                </tr>
            </tbody>
        </table>
    );
}

describe('CustomIdlMark', () => {
    it('should put the marker on the value in the marker variant', () => {
        renderWithVariant('marker', inRow(<CustomIdlMark>swap</CustomIdlMark>));

        expect(screen.getByText('swap')).toHaveClass('bg-custom-idl/30');
        expect(screen.getByTestId('row').style.backgroundColor).toBe('');
    });

    it('should tint the nearest row instead of the value in the row variant', () => {
        renderWithVariant('row', inRow(<CustomIdlMark>swap</CustomIdlMark>));

        expect(screen.getByText('swap')).not.toHaveClass('bg-custom-idl/30');
        expect(screen.getByTestId('row').style.backgroundColor).not.toBe('');
    });

    it('should keep the row tint until the last marked value in the row unmounts', () => {
        const { rerender } = renderWithVariant(
            'row',
            inRow(
                <>
                    <CustomIdlMark>amount</CustomIdlMark>
                    <CustomIdlMark>u64</CustomIdlMark>
                </>,
            ),
        );
        const row = screen.getByTestId('row');

        rerender(inRow(<CustomIdlMark>amount</CustomIdlMark>));
        expect(row.style.backgroundColor).not.toBe('');

        rerender(inRow(<CustomIdlMark active={false}>amount</CustomIdlMark>));
        expect(row.style.backgroundColor).toBe('');
    });

    it('should fall back to the marker where the value sits in no row', () => {
        renderWithVariant('row', <h2>{<CustomIdlMark>Amm V3</CustomIdlMark>}</h2>);

        expect(screen.getByText('Amm V3')).toHaveClass('bg-custom-idl/30');
    });

    it('should clip the rounded card a tinted row sits in, and release it with the tint', () => {
        const card = (children: ReactNode) => (
            // jsdom computes no corner from the `borderRadius` shorthand, so the corner is set directly.
            <div data-testid="card" style={{ borderTopLeftRadius: '8px' }}>
                {inRow(children)}
            </div>
        );
        const { rerender } = renderWithVariant('row', card(<CustomIdlMark>swap</CustomIdlMark>));
        expect(screen.getByTestId('card').style.overflow).toBe('clip');

        rerender(card(<CustomIdlMark active={false}>swap</CustomIdlMark>));
        expect(screen.getByTestId('card').style.overflow).toBe('');
    });

    it('should draw the row edge on the first cell only, and remove it with the tint', () => {
        // jsdom drops a gradient built with color-mix(), so the test watches the calls, not the computed style.
        const setProperty = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty');
        const removeProperty = vi.spyOn(CSSStyleDeclaration.prototype, 'removeProperty');
        const edgeTargets = (spy: typeof setProperty | typeof removeProperty) =>
            spy.mock.calls.flatMap(([property], call) =>
                property === 'background-image' ? [spy.mock.contexts[call]] : [],
            );

        const { rerender } = renderWithVariant('row', inRow(<CustomIdlMark>swap</CustomIdlMark>));
        expect(edgeTargets(setProperty)).toEqual([screen.getByTestId('first-cell').style]);

        rerender(inRow(<CustomIdlMark active={false}>swap</CustomIdlMark>));
        expect(edgeTargets(removeProperty)).toEqual([screen.getByTestId('first-cell').style]);

        setProperty.mockRestore();
        removeProperty.mockRestore();
    });
});
