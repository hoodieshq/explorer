import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TxInvocationStatus } from '../TxInvocationStatus';

describe('TxInvocationStatus', () => {
    const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
    const date = new Date('2024-01-15T10:30:45Z');
    const link = `/tx/${signature}`;

    it('should render the signature, formatted timestamp, and a Success badge anchored to the tx link when status=success', () => {
        render(<TxInvocationStatus status="success" signature={signature} date={date} link={link} />);

        expect(screen.getByText(signature)).toBeInTheDocument();
        expect(screen.getByText('10:30:45 UTC')).toBeInTheDocument();
        expect(screen.getByText('Success', { exact: false })).toBeInTheDocument();

        const anchor = screen.getByRole('link');
        expect(anchor).toHaveAttribute('href', link);
        expect(anchor).toHaveAttribute('target', '_blank');
    });

    it('should render the signature with an Error badge still anchored to the tx link when status=error', () => {
        render(<TxInvocationStatus status="error" signature={signature} date={date} link={link} />);

        expect(screen.getByText(signature)).toBeInTheDocument();
        expect(screen.getByText('Error', { exact: false })).toBeInTheDocument();

        const anchor = screen.getByRole('link');
        expect(anchor).toHaveAttribute('href', link);
    });
});
