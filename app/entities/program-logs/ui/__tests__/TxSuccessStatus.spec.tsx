import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TxSuccessStatus } from '../TxSuccessStatus';

describe('TxSuccessStatus', () => {
    const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
    const date = new Date('2024-01-15T10:30:45Z');
    const link = `/tx/${signature}`;

    it('should render the signature, formatted UTC timestamp, and Success badge', () => {
        render(<TxSuccessStatus signature={signature} date={date} link={link} />);

        expect(screen.getByText(signature)).toBeInTheDocument();
        expect(screen.getByText('10:30:45 UTC')).toBeInTheDocument();
        expect(screen.getByText('Success', { exact: false })).toBeInTheDocument();
    });

    it('should render the badge wrapped in an anchor pointing to the link', () => {
        render(<TxSuccessStatus signature={signature} date={date} link={link} />);

        const anchor = screen.getByRole('link');
        expect(anchor).toHaveAttribute('href', link);
        expect(anchor).toHaveAttribute('target', '_blank');
    });
});
