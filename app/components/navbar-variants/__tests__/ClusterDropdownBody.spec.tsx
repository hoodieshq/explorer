import { fireEvent, render, screen, within } from '@testing-library/react';
import { Cluster, ClusterStatus } from '@utils/cluster';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SavedCluster, savedClustersAtom } from '@/app/features/cluster-switcher/lib/cluster-storage';

import { saveFlowVariantAtom, type SaveFlowVariantId } from '../save-flow-variants';

const CUSTOM_URL = 'http://my-validator:8899';
const OTHER_URL = 'http://staging.example.com';

// Hoisted so the module factory below can close over it.
const nav = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ push: nav.push, replace: nav.replace }),
    useSearchParams: () => nav.searchParams,
}));

const clusterMock = vi.hoisted(() => ({ customUrl: 'http://my-validator:8899' }));

// Spread the real barrel so the origin approval and the selection stay live; only the connection hook is
// stubbed, exactly as `ClusterModal.spec` does it.
vi.mock('@entities/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/cluster')>();
    return {
        ...actual,
        useCluster: () => ({
            ...actual.clusterSelection(Cluster.Custom, clusterMock.customUrl),
            status: ClusterStatus.Failure,
        }),
    };
});

// Must import after mocks

import { ClusterDropdownBody } from '../ClusterDropdownBody';

function renderBody({ saved = [], variant }: { saved?: SavedCluster[]; variant?: SaveFlowVariantId } = {}) {
    const store = createStore();
    if (saved.length > 0) store.set(savedClustersAtom, saved);
    if (variant) store.set(saveFlowVariantAtom, variant);
    return {
        store,
        ...render(
            <Provider store={store}>
                <ClusterDropdownBody />
            </Provider>,
        ),
    };
}

/**
 * On a saved endpoint the Custom plate stays folded — picking from the list is a choice about the list,
 * not a reason to open a form. Its own row is how a reader asks for the field, so a test about the field
 * has to ask the same way.
 */
function openCustomPlate() {
    fireEvent.click(screen.getByRole('link', { name: 'Custom RPC URL' }));
}

describe('ClusterDropdownBody', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        clusterMock.customUrl = CUSTOM_URL;
        nav.searchParams = new URLSearchParams(`cluster=custom&customUrl=${CUSTOM_URL}`);
    });

    // What the redesign is for: the old flow revealed a full-width button only once the field held
    // something savable, so the option existed but could not be found.
    describe.each(['omnibox', 'field', 'prompt', 'morph'] as const)('the %s save flow', variant => {
        it('should offer to save without anything being opened first', () => {
            renderBody({ variant });
            expect(screen.getByTestId('save-custom-cluster-btn')).toBeInTheDocument();
        });
    });

    describe.each(['field', 'prompt', 'morph'] as const)('the %s save flow', variant => {
        it('should say the endpoint is kept, and under which name, once it is', () => {
            renderBody({ saved: [{ name: 'My validator', url: CUSTOM_URL }], variant });
            openCustomPlate();
            expect(screen.queryByTestId('save-custom-cluster-btn')).not.toBeInTheDocument();
            expect(screen.getByTestId('endpoint-saved-as')).toHaveTextContent('My validator');
        });
    });

    // The Save button under the field: it unfolds the name right there, and nothing is kept until the
    // tick. The row's own form is for editing what is already in the list.
    describe('the omnibox save flow', () => {
        const SAVE = 'save-custom-cluster-btn';

        it('should ask for the name under the field and keep nothing yet', () => {
            const { store } = renderBody({ variant: 'omnibox' });
            fireEvent.click(screen.getByTestId(SAVE));
            expect(screen.getByTestId('cluster-name-input')).toBeInTheDocument();
            expect(screen.queryByTestId(`rename-cluster-input-${CUSTOM_URL}`)).not.toBeInTheDocument();
            expect(store.get(savedClustersAtom)).toEqual([]);
        });

        it('should store the name written there', () => {
            const { store } = renderBody({ variant: 'omnibox' });
            fireEvent.click(screen.getByTestId(SAVE));
            fireEvent.change(screen.getByTestId('cluster-name-input'), { target: { value: 'My validator' } });
            fireEvent.click(screen.getByTestId('confirm-save-cluster-btn'));
            expect(store.get(savedClustersAtom)).toEqual([{ name: 'My validator', url: CUSTOM_URL }]);
            expect(screen.queryByTestId('cluster-name-input')).not.toBeInTheDocument();
        });

        // As when editing: nothing is required of the name, and an unnamed entry is headed by its host.
        it('should keep the entry unnamed when the name is left blank', () => {
            const { store } = renderBody({ variant: 'omnibox' });
            fireEvent.click(screen.getByTestId(SAVE));
            expect(screen.getByTestId('cluster-name-input')).toHaveAttribute('placeholder', 'Endpoint name');
            fireEvent.keyDown(screen.getByTestId('cluster-name-input'), { key: 'Enter' });
            expect(store.get(savedClustersAtom)).toEqual([{ name: '', url: CUSTOM_URL }]);
        });

        it('should keep nothing when the naming is dismissed', () => {
            const { store } = renderBody({ variant: 'omnibox' });
            fireEvent.click(screen.getByTestId(SAVE));
            fireEvent.click(screen.getByTestId('cancel-save-cluster-btn'));
            expect(store.get(savedClustersAtom)).toEqual([]);
            expect(screen.getByTestId(SAVE)).toBeEnabled();
        });

        it('should head an unnamed entry with its host, since that is all there is to call it', () => {
            renderBody({ saved: [{ name: '', url: OTHER_URL }], variant: 'omnibox' });
            expect(screen.getByTestId(`pick-cluster-${OTHER_URL}`)).toHaveTextContent('staging.example.com');
        });

        it('should let an unnamed entry be named later', () => {
            const { store } = renderBody({ saved: [{ name: '', url: OTHER_URL }], variant: 'omnibox' });
            fireEvent.click(screen.getByTestId(`rename-cluster-${OTHER_URL}`));
            fireEvent.change(screen.getByTestId(`rename-cluster-input-${OTHER_URL}`), {
                target: { value: 'Staging box' },
            });
            fireEvent.click(screen.getByTestId(`confirm-rename-cluster-${OTHER_URL}`));
            expect(store.get(savedClustersAtom)).toEqual([{ name: 'Staging box', url: OTHER_URL }]);
        });

        // A greyed-out control with no reason given reads as broken, and a `title` is no answer on a
        // touch screen.
        it('should say why Save cannot be pressed on a half-typed URL', () => {
            clusterMock.customUrl = CUSTOM_URL;
            renderBody({ variant: 'omnibox' });
            fireEvent.change(screen.getByTestId('custom-url-omnibox'), { target: { value: 'localhost:8899' } });
            expect(screen.getByTestId('save-custom-cluster-btn')).toBeDisabled();
            expect(screen.getByTestId('save-disabled-reason')).toHaveTextContent('needs a scheme');
        });

        // An empty field is not a fault: nothing has been attempted, and a line telling the reader to
        // type in a field they have not reached yet is the menu talking first.
        it('should stay silent about an empty field', () => {
            renderBody({ variant: 'omnibox' });
            fireEvent.change(screen.getByTestId('custom-url-omnibox'), { target: { value: '' } });
            expect(screen.queryByTestId('save-disabled-reason')).not.toBeInTheDocument();
            expect(screen.getByTestId('save-custom-cluster-btn')).toBeDisabled();
        });

        // Being saved already is an outcome, not something to fix, and the line under the field is where
        // this surface puts what is missing — so the button says "Saved" and nothing is printed there.
        it('should not explain itself when the endpoint is already saved', () => {
            renderBody({ saved: [{ name: 'My validator', url: CUSTOM_URL }], variant: 'omnibox' });
            openCustomPlate();
            expect(screen.queryByTestId('save-disabled-reason')).not.toBeInTheDocument();
            expect(screen.getByTestId('save-custom-cluster-btn').getAttribute('aria-label')).toContain('Already saved');
        });

        it('should report the endpoint in the field as already kept', () => {
            renderBody({ saved: [{ name: 'My validator', url: CUSTOM_URL }], variant: 'omnibox' });
            openCustomPlate();
            const button = screen.getByTestId(SAVE);
            expect(button).toBeDisabled();
            // The bookmark fills in rather than changing its word, so "kept" is read off the name.
            expect(button.getAttribute('aria-label')).toContain('Already saved');
        });

        it('should put a picked entry back in the field rather than only navigating', () => {
            renderBody({ saved: [{ name: 'Staging', url: OTHER_URL }], variant: 'omnibox' });
            fireEvent.click(screen.getByTestId(`pick-cluster-${OTHER_URL}`));
            expect(screen.getByTestId('custom-url-omnibox')).toHaveValue(OTHER_URL);
        });

        it('should commit a picked entry at once, without waiting out the typing debounce', () => {
            renderBody({ saved: [{ name: 'Staging', url: OTHER_URL }], variant: 'omnibox' });
            fireEvent.click(screen.getByTestId(`pick-cluster-${OTHER_URL}`));
            expect(nav.replace).toHaveBeenCalledTimes(1);
            expect(String(nav.replace.mock.calls[0][0])).toContain('staging.example.com');
        });

        // Picking from the list used to unfold the Custom plate over the very list it was picked from.
        it('should not unfold the Custom plate for an endpoint that is in the list', () => {
            renderBody({ saved: [{ name: 'My validator', url: CUSTOM_URL }], variant: 'omnibox' });
            expect(screen.queryByTestId('custom-url-omnibox')).not.toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Custom RPC URL' })).toBeInTheDocument();
        });

        it('should still open the plate when the reader asks for it by its own row', () => {
            renderBody({ saved: [{ name: 'My validator', url: CUSTOM_URL }], variant: 'omnibox' });
            openCustomPlate();
            expect(screen.getByTestId('custom-url-omnibox')).toBeInTheDocument();
        });

        it('should unfold the plate for a hand-typed endpoint, which only the field can show', () => {
            renderBody({ variant: 'omnibox' });
            expect(screen.getByTestId('custom-url-omnibox')).toBeInTheDocument();
        });

        it('should keep the list under the heading it has always had', () => {
            renderBody({ saved: [{ name: 'Staging', url: OTHER_URL }], variant: 'omnibox' });
            expect(screen.getByText('Saved endpoints')).toBeInTheDocument();
        });
    });

    describe('a saved endpoint', () => {
        const SAVED = [{ name: 'My validator', url: CUSTOM_URL }];

        // The layout bug this replaced: the facts were pinned over the row's right edge, where at 320px
        // they printed straight over the name and the host. In flow they cannot.
        it('should carry the connection facts inside the row, not over it', () => {
            renderBody({ saved: SAVED, variant: 'field' });
            const row = screen.getByTestId(`saved-cluster-${CUSTOM_URL}`);
            expect(within(row).getByRole('link')).toHaveTextContent('not connected');
        });

        // `styles.css` reverts the UA button background for the app's legacy buttons, so a row that names
        // no background of its own renders as a white slab on this dark ground — which is what happened
        // the moment picking a row became a button rather than a link.
        it('should name its own background, so a button row cannot fall back to UA chrome', () => {
            // The row that is *not* the endpoint in use: the one in use carries its own fill, and it was
            // the other rows that came out as white slabs.
            renderBody({ saved: [...SAVED, { name: 'Staging', url: OTHER_URL }], variant: 'omnibox' });
            expect(screen.getByTestId(`pick-cluster-${OTHER_URL}`)).toHaveClass('bg-transparent');
        });

        it('should carry them inside a picked row too', () => {
            renderBody({ saved: SAVED, variant: 'omnibox' });
            expect(screen.getByTestId(`pick-cluster-${CUSTOM_URL}`)).toHaveTextContent('not connected');
        });

        it('should rename in place, keeping the URL and the position in the list', () => {
            const { store } = renderBody({ saved: [...SAVED, { name: 'Staging', url: OTHER_URL }] });
            fireEvent.click(screen.getByTestId(`rename-cluster-${CUSTOM_URL}`));
            fireEvent.change(screen.getByTestId(`rename-cluster-input-${CUSTOM_URL}`), {
                target: { value: 'Local box' },
            });
            fireEvent.click(screen.getByTestId(`confirm-rename-cluster-${CUSTOM_URL}`));
            expect(store.get(savedClustersAtom)).toEqual([
                { name: 'Local box', url: CUSTOM_URL },
                { name: 'Staging', url: OTHER_URL },
            ]);
        });

        // Names are labels now, not identities: two endpoints may carry one label without either becoming
        // unreachable, because everything addresses them by URL.
        it('should accept a name another endpoint already holds', () => {
            const { store } = renderBody({ saved: [...SAVED, { name: 'Staging', url: OTHER_URL }] });
            fireEvent.click(screen.getByTestId(`rename-cluster-${CUSTOM_URL}`));
            fireEvent.change(screen.getByTestId(`rename-cluster-input-${CUSTOM_URL}`), {
                target: { value: 'Staging' },
            });
            fireEvent.click(screen.getByTestId(`confirm-rename-cluster-${CUSTOM_URL}`));
            expect(store.get(savedClustersAtom).map(c => c.url)).toEqual([CUSTOM_URL, OTHER_URL]);
            expect(store.get(savedClustersAtom).every(c => c.name === 'Staging')).toBe(true);
        });

        // Deleting lives inside the edit form now — it was the one control on a row that a thumb could
        // destroy by landing wrong.
        it('should delete by URL, which is the only handle an unnamed entry has', () => {
            const { store } = renderBody({ saved: [{ name: '', url: OTHER_URL }, ...SAVED] });
            fireEvent.click(screen.getByTestId(`delete-cluster-${OTHER_URL}`));
            expect(store.get(savedClustersAtom)).toEqual(SAVED);
        });
    });
});
