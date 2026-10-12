import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { BaseStarRating } from '../BaseStarRating';

describe('BaseStarRating', () => {
    it('should select the clicked star', async () => {
        render(<ControlledRating />);

        await userEvent.click(screen.getByRole('radio', { name: '3 of 5 stars' }));

        expect(screen.getByRole('radio', { name: '3 of 5 stars' })).toBeChecked();
    });

    it('should clear the rating when the selected star is clicked again', async () => {
        render(<ControlledRating />);
        const star = screen.getByRole('radio', { name: '3 of 5 stars' });

        await userEvent.click(star);
        await userEvent.click(star);

        expect(screen.getAllByRole('radio').some(radio => (radio as HTMLInputElement).checked)).toBe(false);
    });

    it('should move the rating when another star is clicked', async () => {
        render(<ControlledRating />);

        await userEvent.click(screen.getByRole('radio', { name: '3 of 5 stars' }));
        await userEvent.click(screen.getByRole('radio', { name: '5 of 5 stars' }));

        expect(screen.getByRole('radio', { name: '5 of 5 stars' })).toBeChecked();
        expect(screen.getByRole('radio', { name: '3 of 5 stars' })).not.toBeChecked();
    });
});

function ControlledRating() {
    const [rating, setRating] = useState(0);
    return <BaseStarRating onChange={setRating} value={rating} />;
}
