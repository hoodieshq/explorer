/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { render, screen } from '@testing-library/react';

import type { SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';

import { SimulationHint, SimulationJumpHint } from '../SimulationHint';

const IDLE: SimulationState = { simulate: () => undefined, status: 'idle' };

describe('inspector::SimulationHint', () => {
    test('should explain the empty Change column, offer a run and link to the logs', () => {
        render(<SimulationHint simulation={IDLE} />);

        expect(screen.getByText(/Simulate to see balance changes/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Logs block' })).toHaveAttribute('href', '#logs');
        expect(screen.getByRole('button', { name: 'Simulate' })).toBeEnabled();
    });

    test('should say nothing once a run has produced usable balance changes', () => {
        const done = {
            result: { logs: [], solBalanceChanges: [] },
            status: 'done',
        } as unknown as SimulationState;

        const { container } = render(<SimulationHint simulation={done} />);

        expect(container).toBeEmptyDOMElement();
    });
});

describe('inspector::SimulationJumpHint', () => {
    test('should point at the simulation block rather than starting a run', () => {
        render(<SimulationJumpHint />);

        expect(screen.getByText(/Looking for a simulation/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Go to simulation' })).toHaveAttribute('href', '#simulation');
        expect(screen.getByRole('link', { name: 'logs' })).toHaveAttribute('href', '#logs');
        expect(screen.queryByRole('button', { name: 'Simulate' })).not.toBeInTheDocument();
    });
});
