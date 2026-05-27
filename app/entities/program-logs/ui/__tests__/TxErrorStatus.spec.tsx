import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TxErrorStatus } from '../TxErrorStatus';

describe('TxErrorStatus', () => {
    const date = new Date('2024-01-15T10:30:45Z');

    it('should render the message and default Error label when message and link are provided', () => {
        render(<TxErrorStatus message="error message" date={date} link="/tx/inspector?message=foo" />);

        expect(screen.getByText('error message')).toBeInTheDocument();
        expect(screen.getByText('10:30:45 UTC')).toBeInTheDocument();

        const anchor = screen.getByRole('link');
        expect(anchor).toHaveAttribute('href', '/tx/inspector?message=foo');
    });

    it('should render a plain badge with no anchor when link is undefined', () => {
        render(<TxErrorStatus message="error message" date={date} link={undefined} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should render the custom label when label prop is passed', () => {
        render(<TxErrorStatus message={undefined} date={date} link={undefined} label="Simulation Error" />);

        expect(screen.getByText('Simulation Error')).toBeInTheDocument();
    });
});
