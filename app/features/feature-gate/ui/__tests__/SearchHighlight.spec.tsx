import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Highlight, SearchHighlightProvider } from '../SearchHighlight';

describe('Highlight', () => {
    it('should mark every part the search found, keeping the text whole', () => {
        const { container } = render(
            <SearchHighlightProvider query="stake">
                <p>
                    <Highlight text="Stake and unstake" />
                </p>
            </SearchHighlightProvider>,
        );

        expect(
            screen
                .getAllByText(content => content.toLowerCase() === 'stake', { selector: 'mark' })
                .map(mark => mark.textContent),
        ).toEqual(['Stake', 'stake']);
        expect(container).toHaveTextContent('Stake and unstake');
    });

    it('should leave the text plain outside a search', () => {
        render(<Highlight text="Stake" />);

        expect(screen.getByText('Stake').tagName).not.toBe('MARK');
    });
});
