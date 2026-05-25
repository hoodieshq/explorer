import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SimulationSuccessStatus } from '../SimulationSuccessStatus';

describe('SimulationSuccessStatus', () => {
    const date = new Date('2024-01-15T10:30:45Z');

    it('should render the units consumed with en-US grouping and the Simulated badge', () => {
        render(<SimulationSuccessStatus unitsConsumed={123_456} date={date} />);

        expect(screen.getByText('123,456 CU')).toBeInTheDocument();
        expect(screen.getByText('10:30:45 UTC')).toBeInTheDocument();
        expect(screen.getByText('Simulated')).toBeInTheDocument();
    });

    it('should hide the CU block when unitsConsumed is undefined', () => {
        render(<SimulationSuccessStatus unitsConsumed={undefined} date={date} />);

        expect(screen.queryByText('CU', { exact: false })).not.toBeInTheDocument();
        expect(screen.getByText('10:30:45 UTC')).toBeInTheDocument();
        expect(screen.getByText('Simulated')).toBeInTheDocument();
    });
});
