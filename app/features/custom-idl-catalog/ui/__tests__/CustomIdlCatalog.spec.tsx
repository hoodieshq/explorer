import { fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addCustomIdlAtom, programIdlPreferencesAtom } from '@/app/entities/idl/model/custom-idl/custom-idl-store';

import { CustomIdlCatalog } from '../CustomIdlCatalog';

const viewport = vi.hoisted(() => ({ isMd: true }));
vi.mock('@/app/shared/lib/use-breakpoint', () => ({ useBreakpoint: () => ({ isMd: viewport.isMd }) }));
vi.mock('@providers/cluster', () => ({ useCluster: () => ({ cluster: 0, url: 'http://localhost' }) }));
vi.mock('@utils/url', () => ({ useClusterPath: ({ pathname }: { pathname: string }) => pathname }));
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const VOTING = 'AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye';
const OTHER = 'ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S';
const idlFor = (address: string, name: string) => ({ address, instructions: [], metadata: { name, spec: '0.1.0' } });

function openCatalog(store = createStore()) {
    render(
        <Provider store={store}>
            <CustomIdlCatalog open onOpenChange={vi.fn()} />
        </Provider>,
    );
    return store;
}

describe('CustomIdlCatalog', () => {
    beforeEach(() => {
        localStorage.clear();
        viewport.isMd = true;
    });

    it('should list the programs with a custom IDL and show the first one', () => {
        const store = createStore();
        store.set(addCustomIdlAtom, {
            custom: { addedAt: 1, idl: idlFor(VOTING, 'voting') as never },
            programAddress: VOTING,
        });
        openCatalog(store);

        expect(screen.getByRole('button', { name: name => name.startsWith('Voting') })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.getByRole('link', { name: VOTING })).toHaveAttribute('href', `/address/${VOTING}/idl`);
        // Viewing, not editing: the JSON is read-only until Edit IDL.
        expect(screen.getByLabelText('Anchor 0.30.1 (version 0.1.0)')).toHaveTextContent('"name": "voting"');
        expect(screen.queryByRole('textbox', { name: 'Or paste JSON' })).not.toBeInTheDocument();
    });

    it('should edit the IDL in a form, and go back to viewing it on cancel', () => {
        const store = createStore();
        store.set(addCustomIdlAtom, {
            custom: { addedAt: 1, idl: idlFor(VOTING, 'voting') as never },
            programAddress: VOTING,
        });
        openCatalog(store);

        fireEvent.click(screen.getByRole('button', { name: 'Edit IDL' }));
        expect(screen.getByText('Edit IDL', { selector: 'span' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Or paste JSON' })).toHaveValue(
            JSON.stringify(idlFor(VOTING, 'voting'), undefined, 2),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByLabelText('Anchor 0.30.1 (version 0.1.0)')).toBeInTheDocument();
        expect(store.get(programIdlPreferencesAtom)[VOTING]?.custom?.idl).toEqual(idlFor(VOTING, 'voting'));
    });

    it('should save an edited IDL and show it', () => {
        const store = createStore();
        store.set(addCustomIdlAtom, {
            custom: { addedAt: 1, idl: idlFor(VOTING, 'voting') as never },
            programAddress: VOTING,
        });
        openCatalog(store);

        fireEvent.click(screen.getByRole('button', { name: 'Edit IDL' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Or paste JSON' }), {
            target: { value: JSON.stringify(idlFor(VOTING, 'voting_v2')) },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save IDL' }));

        expect(screen.getByLabelText('Anchor 0.30.1 (version 0.1.0)')).toHaveTextContent('"name": "voting_v2"');
    });

    it('should remove the selected IDL and fall back to the upload form', () => {
        const store = createStore();
        store.set(addCustomIdlAtom, {
            custom: { addedAt: 1, idl: idlFor(VOTING, 'voting') as never },
            programAddress: VOTING,
        });
        openCatalog(store);

        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        expect(store.get(programIdlPreferencesAtom)).toEqual({});
        expect(screen.getByText('Upload an IDL')).toBeInTheDocument();
    });

    it('should add an IDL for the program it declares and select it', () => {
        const store = openCatalog();

        fireEvent.change(screen.getByRole('textbox', { name: 'Or paste JSON' }), {
            target: { value: JSON.stringify(idlFor(OTHER, 'other')) },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add IDL' }));

        expect(store.get(programIdlPreferencesAtom)[OTHER]?.selected).toBe('custom');
        expect(screen.getByRole('button', { name: name => name.startsWith('Other') })).toHaveAttribute(
            'aria-current',
            'true',
        );
    });

    it('should hide the program address field while the IDL declares one', () => {
        openCatalog();
        expect(screen.queryByRole('textbox', { name: 'Program address' })).not.toBeInTheDocument();

        fireEvent.change(screen.getByRole('textbox', { name: 'Or paste JSON' }), {
            target: { value: JSON.stringify(idlFor(OTHER, 'other')) },
        });
        expect(screen.queryByRole('textbox', { name: 'Program address' })).not.toBeInTheDocument();
    });

    it('should ask for the program address under the IDL when the IDL declares none', () => {
        const store = openCatalog();
        const legacy = JSON.stringify({ instructions: [], name: 'legacy' });

        fireEvent.change(screen.getByRole('textbox', { name: 'Or paste JSON' }), { target: { value: legacy } });
        fireEvent.click(screen.getByRole('button', { name: 'Add IDL' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Enter the program address');

        fireEvent.change(screen.getByRole('textbox', { name: 'Program address' }), { target: { value: OTHER } });
        fireEvent.click(screen.getByRole('button', { name: 'Add IDL' }));
        expect(store.get(programIdlPreferencesAtom)[OTHER]?.selected).toBe('custom');
    });

    describe('on a phone', () => {
        beforeEach(() => {
            viewport.isMd = false;
        });

        it('should show the list first, then the picked IDL with the way back at the bottom', () => {
            const store = createStore();
            store.set(addCustomIdlAtom, {
                custom: { addedAt: 1, idl: idlFor(VOTING, 'voting') as never },
                programAddress: VOTING,
            });
            openCatalog(store);

            expect(screen.getByRole('navigation', { name: 'Programs with a custom IDL' })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: name => name.startsWith('Voting') }));
            expect(screen.queryByRole('navigation', { name: 'Programs with a custom IDL' })).not.toBeInTheDocument();
            // The actions sit in the drawer footer, next to Back.
            expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: 'Back' }));
            expect(screen.getByRole('navigation', { name: 'Programs with a custom IDL' })).toBeInTheDocument();
        });

        it('should go back to the list after a remove', () => {
            const store = createStore();
            store.set(addCustomIdlAtom, {
                custom: { addedAt: 1, idl: idlFor(VOTING, 'voting') as never },
                programAddress: VOTING,
            });
            openCatalog(store);

            fireEvent.click(screen.getByRole('button', { name: name => name.startsWith('Voting') }));
            fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

            expect(screen.getByRole('navigation', { name: 'Programs with a custom IDL' })).toBeInTheDocument();
        });
    });
});
