import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TxSimulationStatus } from '../TxSimulationStatus';

describe('TxSimulationStatus', () => {
    const date = new Date('2024-01-15T10:30:45Z');
    const inspectorLink = '/tx/inspector?message=ABC';

    it('should render CU count + a Simulated badge anchored to the inspector when status=success and link provided', () => {
        render(<TxSimulationStatus status="success" unitsConsumed={123_456} date={date} link={inspectorLink} />);

        expect(screen.getByText('123,456 CU')).toBeInTheDocument();
        expect(screen.getByText('10:30:45 UTC')).toBeInTheDocument();
        expect(screen.getByText('Simulated', { exact: false })).toBeInTheDocument();

        const anchor = screen.getByRole('link');
        expect(anchor).toHaveAttribute('href', inspectorLink);
    });

    it('should hide the CU block when unitsConsumed is undefined', () => {
        render(<TxSimulationStatus status="success" unitsConsumed={undefined} date={date} link={inspectorLink} />);

        expect(screen.queryByText('CU', { exact: false })).not.toBeInTheDocument();
        expect(screen.getByText('Simulated', { exact: false })).toBeInTheDocument();
    });

    it('should render the message + Simulation Error badge anchored to the inspector when status=error and link provided', () => {
        render(<TxSimulationStatus status="error" message="AccountNotFound" date={date} link={inspectorLink} />);

        expect(screen.getByText('AccountNotFound')).toBeInTheDocument();
        expect(screen.getByText('Simulation Error', { exact: false })).toBeInTheDocument();

        const anchor = screen.getByRole('link');
        expect(anchor).toHaveAttribute('href', inspectorLink);
    });

    it('should render the message + plain Simulation Error badge with no anchor when link is omitted', () => {
        render(<TxSimulationStatus status="error" message="Simulation failed" date={date} />);

        expect(screen.getByText('Simulation failed')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByText('Simulation Error', { exact: false })).toBeInTheDocument();
    });
});
