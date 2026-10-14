import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addCustomIdlAtom } from '../../model/custom-idl/custom-idl-store';
import { StoredProgramIdlSelector } from '../ProgramIdlSlot';

const mocks = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('../ProgramIdlSelector', () => ({ ProgramIdlSelector: () => <span>selector</span> }));
vi.mock('../BaseIdlSelectUnavailable', () => ({ BaseIdlSelectUnavailable: () => <span>unavailable</span> }));

const PROGRAM = 'devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH';

function renderSelector({ stored, decodedByRpc = false }: { stored: boolean; decodedByRpc?: boolean }) {
    const store = createStore();
    if (stored) {
        store.set(addCustomIdlAtom, {
            custom: { addedAt: 1, idl: { instructions: [], metadata: { name: 'amm', spec: '0.1.0' } } as never },
            programAddress: PROGRAM,
        });
    }
    return render(
        <Provider store={store}>
            <StoredProgramIdlSelector programAddress={PROGRAM} decodedByRpc={decodedByRpc} />
        </Provider>,
    );
}

describe('StoredProgramIdlSelector', () => {
    beforeEach(() => {
        mocks.pathname = '/';
    });

    it('should show nothing for a program without a stored custom IDL', () => {
        const { container } = renderSelector({ stored: false });

        expect(container).toBeEmptyDOMElement();
    });

    it('should show the selector once the program has a stored custom IDL', () => {
        renderSelector({ stored: true });

        expect(screen.getByText('selector')).toBeInTheDocument();
    });

    it('should show the unavailable stand-in for an RPC-decoded instruction of such a program', () => {
        renderSelector({ decodedByRpc: true, stored: true });

        expect(screen.getByText('unavailable')).toBeInTheDocument();
    });

    it('should hide the selector on a page the design menu turned the custom IDL off for', () => {
        // The transaction page is off until a reviewer switches it on.
        mocks.pathname = '/tx/5abc';
        const { container } = renderSelector({ stored: true });

        expect(container).toBeEmptyDOMElement();
    });
});
