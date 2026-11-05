import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { PageSearch } from '../PageSearch';

function Harness({ initial = '', mode }: { initial?: string; mode?: 'button' | 'combo' | 'field' }) {
    const [value, setValue] = useState(initial);
    const [open, setOpen] = useState(false);
    return (
        <PageSearch
            value={value}
            onChange={setValue}
            open={open}
            onOpenChange={setOpen}
            label="Search feature gates"
            placeholder="Search"
            mode={mode}
        />
    );
}

describe('PageSearch', () => {
    it('should open from the Search button into a focused field', () => {
        render(<Harness />);
        expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
        expect(screen.getByRole('searchbox', { name: 'Search feature gates' })).toHaveFocus();
    });

    it('should stay open while it holds a query and close when left empty', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
        const field = screen.getByRole('searchbox');

        fireEvent.change(field, { target: { value: 'stake' } });
        fireEvent.blur(field);
        expect(screen.getByRole('searchbox')).toHaveValue('stake');

        fireEvent.change(field, { target: { value: '' } });
        fireEvent.blur(field);
        expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('should clear and close on Escape, handing focus back to the button', () => {
        render(<Harness initial="stake" />);

        fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
        expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open search' })).toHaveFocus();
    });

    it('should clear a query from the cross first, then close the empty field', () => {
        render(<Harness initial="stake" />);

        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(screen.getByRole('searchbox')).toHaveValue('');

        fireEvent.click(screen.getByRole('button', { name: 'Close search' }));
        expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('should show an always-open field without taking focus, its cross only clearing a query', () => {
        render(<Harness mode="field" />);
        const field = screen.getByRole('searchbox', { name: 'Search feature gates' });
        expect(field).not.toHaveFocus();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();

        fireEvent.change(field, { target: { value: 'stake' } });
        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(screen.getByRole('searchbox')).toHaveValue('');

        fireEvent.blur(field);
        fireEvent.keyDown(field, { key: 'Escape' });
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should draw the closed combo as both the button and, from sm, the field that opens the search on focus', () => {
        render(<Harness mode="combo" />);
        const field = screen.getByRole('searchbox', { name: 'Search feature gates' });
        expect(field).toHaveClass('hidden', 'sm:block');
        expect(screen.getByRole('button', { name: 'Open search' })).toHaveClass('sm:hidden');
        expect(field).not.toHaveFocus();

        fireEvent.focus(field);
        expect(screen.getByRole('searchbox')).not.toHaveClass('hidden');
        // On desktop the cross waits for a query; below `sm` it closes the open field.
        expect(screen.getByRole('button', { name: 'Close search' })).toHaveClass('sm:hidden');

        fireEvent.change(field, { target: { value: 'stake' } });
        expect(screen.getByRole('button', { name: 'Clear search' })).not.toHaveClass('sm:hidden');
    });
});
