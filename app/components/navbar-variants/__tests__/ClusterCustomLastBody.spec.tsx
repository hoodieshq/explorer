import { fireEvent, render, screen, within } from '@testing-library/react';
import { Cluster, ClusterStatus } from '@utils/cluster';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SavedCluster, savedClustersAtom } from '@/app/features/cluster-switcher/lib/cluster-storage';

const CUSTOM_URL = 'http://my-validator:8899';
const OTHER_URL = 'http://staging.example.com';

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

const clusterMock = vi.hoisted(() => ({ customUrl: 'http://my-validator:8899', onCustom: true }));

vi.mock('@entities/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/cluster')>();
    return {
        ...actual,
        useCluster: () => ({
            ...actual.clusterSelection(
                clusterMock.onCustom ? Cluster.Custom : Cluster.MainnetBeta,
                clusterMock.customUrl,
            ),
            status: ClusterStatus.Failure,
        }),
    };
});

// Must import after mocks

import { DEFAULT_RPC_ENDPOINT } from '@entities/cluster';

import { ClusterCustomLastBody } from '../ClusterCustomLastBody';

const DEFAULT_URL = DEFAULT_RPC_ENDPOINT.href;

function renderBody(saved: SavedCluster[] = []) {
    const store = createStore();
    if (saved.length > 0) store.set(savedClustersAtom, saved);
    const onDismiss = vi.fn();
    return {
        onDismiss,
        store,
        ...render(
            <Provider store={store}>
                <ClusterCustomLastBody onDismiss={onDismiss} />
            </Provider>,
        ),
    };
}

/** The caret is placed a frame after the focus, so a test that measures it has to let that frame pass. */
function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
}

describe('ClusterCustomLastBody (v3.5)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        clusterMock.customUrl = CUSTOM_URL;
        clusterMock.onCustom = true;
    });

    // A section of its own at the foot of the menu: the caption, and the field under it. Nothing has to
    // be clicked to reach the field, and no row stands in for it.
    it('should head the field with a caption rather than a row', () => {
        renderBody();
        expect(screen.getByText('Custom RPC URL')).toBeInTheDocument();
        expect(screen.queryByTestId('custom-cluster-row')).not.toBeInTheDocument();
    });

    it('should keep the field on screen whatever is in use', () => {
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        expect(screen.getByTestId('custom-url-omnibox')).toBeInTheDocument();
    });

    // The commonest thing anyone types here, and the one nobody enjoys typing.
    it('should start an empty field at the local validator on focus', () => {
        clusterMock.onCustom = false;
        renderBody();
        expect(screen.getByTestId('custom-url-omnibox')).toHaveValue('');
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        expect(screen.getByTestId('custom-url-omnibox')).toHaveValue(DEFAULT_URL);
    });

    // A click lands the caret where the finger pointed, which mid-URL is rarely where the reader meant
    // to be.
    it('should put the caret at the end of the address on the first reach into the field', async () => {
        renderBody();
        const field = screen.getByTestId<HTMLInputElement>('custom-url-omnibox');
        field.setSelectionRange(0, 0);
        fireEvent.focus(field);
        await nextFrame();
        expect(field.selectionStart).toBe(CUSTOM_URL.length);
    });

    // Moving it on every focus would fight the reader the moment they come back to fix a character.
    it('should leave the caret alone on later focuses', async () => {
        renderBody();
        const field = screen.getByTestId<HTMLInputElement>('custom-url-omnibox');
        fireEvent.focus(field);
        // The placement happens a frame later, so the first one has to be let through before the caret is
        // moved — otherwise it lands after the move and the test measures the wrong thing.
        await nextFrame();
        field.setSelectionRange(4, 4);
        fireEvent.focus(field);
        await nextFrame();
        expect(field.selectionStart).toBe(4);
    });

    // A field that already holds an endpoint is holding it on purpose.
    it('should leave a field that already holds an endpoint alone', () => {
        renderBody();
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        expect(screen.getByTestId('custom-url-omnibox')).toHaveValue(CUSTOM_URL);
    });

    // One form at a time: two open in a menu this size have no answer to "which of these am I changing?",
    // and the one you were not looking at is the one that would have been saved by mistake.
    it('should close the entry being edited when another is opened', () => {
        renderBody([
            { name: 'Staging', url: OTHER_URL },
            { name: 'Local', url: 'http://localhost:9999' },
        ]);
        fireEvent.click(screen.getByTestId(`rename-cluster-${OTHER_URL}`));
        expect(screen.getByTestId(`rename-cluster-input-${OTHER_URL}`)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('rename-cluster-http://localhost:9999'));
        expect(screen.queryByTestId(`rename-cluster-input-${OTHER_URL}`)).not.toBeInTheDocument();
        expect(screen.getByTestId('rename-cluster-input-http://localhost:9999')).toBeInTheDocument();
    });

    it('should discard what was typed in the form it closes', () => {
        const { store } = renderBody([
            { name: 'Staging', url: OTHER_URL },
            { name: 'Local', url: 'http://localhost:9999' },
        ]);
        fireEvent.click(screen.getByTestId(`rename-cluster-${OTHER_URL}`));
        fireEvent.change(screen.getByTestId(`rename-cluster-input-${OTHER_URL}`), { target: { value: 'Half typed' } });
        fireEvent.click(screen.getByTestId('rename-cluster-http://localhost:9999'));
        expect(store.get(savedClustersAtom)[0]).toEqual({ name: 'Staging', url: OTHER_URL });
    });

    // The list is the only record of an address anyone typed, and a delete is one click.
    it('should keep a removed endpoint in its place, struck through, with the way back', () => {
        renderBody([
            { name: 'Staging', url: OTHER_URL },
            { name: 'Local', url: 'http://localhost:9999' },
        ]);
        fireEvent.click(screen.getByTestId(`delete-cluster-${OTHER_URL}`));
        expect(screen.getByText('Staging')).toHaveClass('line-through');
        expect(screen.getByTestId(`restore-cluster-${OTHER_URL}`)).toBeInTheDocument();
        // Still where it stood: after the pinned default, above the entry that followed it.
        const rows = within(screen.getByTestId('saved-clusters-section')).getAllByRole('listitem');
        expect(rows.map(row => row.dataset.testid)).toEqual([
            `saved-cluster-${DEFAULT_URL}`,
            `saved-cluster-${OTHER_URL}`,
            'saved-cluster-http://localhost:9999',
        ]);
    });

    it('should put it back where it stood', () => {
        const { store } = renderBody([
            { name: 'Staging', url: OTHER_URL },
            { name: 'Local', url: 'http://localhost:9999' },
        ]);
        fireEvent.click(screen.getByTestId(`delete-cluster-${OTHER_URL}`));
        fireEvent.click(screen.getByTestId(`restore-cluster-${OTHER_URL}`));
        expect(store.get(savedClustersAtom)).toEqual([
            { name: 'Staging', url: OTHER_URL },
            { name: 'Local', url: 'http://localhost:9999' },
        ]);
        expect(screen.queryByTestId(`restore-cluster-${OTHER_URL}`)).not.toBeInTheDocument();
    });

    // Deleting is behind the deliberate step of opening the entry, beside Save and Cancel but away from
    // them.
    // A row control, one click — the undo standing behind it is what makes that safe.
    it('should delete from the row', () => {
        const { store } = renderBody([{ name: 'Staging', url: OTHER_URL }]);
        fireEvent.click(screen.getByTestId(`delete-cluster-${OTHER_URL}`));
        expect(store.get(savedClustersAtom)).toEqual([]);
        expect(screen.getByTestId(`restore-cluster-${OTHER_URL}`)).toBeInTheDocument();
    });

    // The mark stands in the same corner the controls use, and steps aside for them on hover — a hand
    // over the row is reaching for the pencil, not for a badge.
    it('should keep the provenance mark out of the way of the row controls', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        expect(screen.getByTestId(`provenance-mark-${OTHER_URL}`)).toHaveClass(
            'absolute',
            'right-1.5',
            'top-1.5',
            '[@media(hover:hover)]:group-hover/row:opacity-0',
        );
    });

    // The gap under a heading must be the heading's own, not the list's: both groups are a caption with
    // `pb-2` and a list with no top margin of its own, so "Default" sits under "Your endpoints" exactly as
    // "Mainnet Beta" sits under "Cluster".
    it('should leave the same gap under both headings', () => {
        renderBody();
        const lists = screen.getAllByRole('list');
        for (const list of lists) expect(list).toHaveClass('m-0', 'p-0');
    });

    // The endpoint the app falls back to stands at the head of the list as a fixture: pickable, and
    // neither editable nor deletable, because it is not in storage — an edit would have nowhere to land.
    it('should list the default endpoint even with nothing saved', () => {
        renderBody();
        expect(screen.getByTestId(`pick-cluster-${DEFAULT_URL}`)).toBeInTheDocument();
    });

    it('should offer neither an edit nor a delete on it', () => {
        renderBody();
        expect(screen.queryByTestId(`rename-cluster-${DEFAULT_URL}`)).not.toBeInTheDocument();
        expect(screen.queryByTestId(`delete-cluster-${DEFAULT_URL}`)).not.toBeInTheDocument();
    });

    it('should still let it be loaded into the field', () => {
        renderBody();
        fireEvent.click(screen.getByTestId(`pick-cluster-${DEFAULT_URL}`));
        expect(screen.getByTestId('custom-url-omnibox')).toHaveValue(DEFAULT_URL);
    });

    // It is in the list as far as the reader is concerned, so offering to save it again would be the
    // menu offering to add what it is already showing.
    it('should not offer to save the default endpoint', () => {
        clusterMock.customUrl = DEFAULT_URL;
        renderBody();
        const button = screen.getByTestId('save-custom-cluster-btn');
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent('Saved');
    });

    // Their entry is the same endpoint under a name they chose; two rows for one address is one too many.
    // It is still the app's own address, so it is still not an entry to edit or delete.
    it('should stand aside when the reader has saved that endpoint themselves', () => {
        renderBody([{ name: 'My validator', url: DEFAULT_URL }]);
        expect(screen.getAllByTestId(`pick-cluster-${DEFAULT_URL}`)).toHaveLength(1);
        expect(screen.getByText('My validator')).toBeInTheDocument();
        expect(screen.queryByTestId(`rename-cluster-${DEFAULT_URL}`)).not.toBeInTheDocument();
    });

    // Your own endpoints come second — above the Custom section, under the clusters.
    it('should list your endpoints above the Custom section', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        const list = screen.getByTestId('saved-clusters-section');
        const field = screen.getByTestId('custom-url-omnibox');
        // `compareDocumentPosition` rather than reading parents: the question is document order, which is
        // the thing this variant changes.
        expect(list.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByText('Your endpoints')).toBeInTheDocument();
    });

    // On a phone the popover stands over the page it has just changed, so a value applied behind it reads
    // as nothing having happened.
    it('should shut the menu when a cluster is chosen', () => {
        const { onDismiss } = renderBody();
        fireEvent.click(screen.getByRole('link', { name: 'Devnet' }));
        expect(onDismiss).toHaveBeenCalled();
    });

    it('should shut the menu when an endpoint is picked from the list', () => {
        const { onDismiss } = renderBody([{ name: 'Staging', url: OTHER_URL }]);
        fireEvent.click(screen.getByTestId(`pick-cluster-${OTHER_URL}`));
        expect(onDismiss).toHaveBeenCalled();
    });

    // A touch browser spends the first tap on a row with hover styles showing that hover; the pick runs
    // on the pointer's own release so one tap is enough.
    it('should pick on the release, not on the click that follows it', () => {
        const { onDismiss } = renderBody([{ name: 'Staging', url: OTHER_URL }]);
        const row = screen.getByTestId(`pick-cluster-${OTHER_URL}`);
        fireEvent.pointerDown(row, { clientX: 10, clientY: 10 });
        fireEvent.pointerUp(row, { clientX: 10, clientY: 10 });
        expect(screen.getByTestId('custom-url-omnibox')).toHaveValue(OTHER_URL);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    // ...and the click that the same gesture produces must not run it a second time.
    it('should not pick twice for one tap', () => {
        const { onDismiss } = renderBody([{ name: 'Staging', url: OTHER_URL }]);
        const row = screen.getByTestId(`pick-cluster-${OTHER_URL}`);
        fireEvent.pointerDown(row, { clientX: 10, clientY: 10 });
        fireEvent.pointerUp(row, { clientX: 10, clientY: 10 });
        fireEvent.click(row);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    // A finger that lands on a row to drag the list is not choosing it — this is what made the menu
    // unscrollable on a phone. Covered through `pointercancel`, which is what a browser sends when it
    // takes the gesture over: jsdom drops `clientX`/`clientY` from pointer events entirely, so the
    // component's distance check has nothing to measure here and cannot be tested at this level.
    it('should not pick when the browser takes the gesture over for a scroll', () => {
        const { onDismiss } = renderBody([{ name: 'Staging', url: OTHER_URL }]);
        const row = screen.getByTestId(`pick-cluster-${OTHER_URL}`);
        fireEvent.pointerDown(row, { clientX: 10, clientY: 120 });
        fireEvent.pointerCancel(row);
        fireEvent.pointerUp(row, { clientX: 10, clientY: 120 });
        expect(onDismiss).not.toHaveBeenCalled();
    });

    // Work inside the menu, not a choice from it.
    it('should stay open while the endpoint in the field is being saved', () => {
        const { onDismiss } = renderBody();
        fireEvent.click(screen.getByTestId('save-custom-cluster-btn'));
        expect(onDismiss).not.toHaveBeenCalled();
    });

    // A choice made in the list is not a request to type: the outline goes back to the row that was
    // picked.
    it('should hand the outline back to the row when one is picked from the list', () => {
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        expect(screen.getByTestId('custom-field-plate')).toHaveClass('border-white/10');
        fireEvent.click(screen.getByTestId(`pick-cluster-${CUSTOM_URL}`));
        expect(screen.getByTestId('custom-field-plate')).not.toHaveClass('border-white/10');
        expect(screen.getByTestId(`pick-cluster-${CUSTOM_URL}`)).toHaveAttribute('aria-current', 'true');
    });

    // Reaching into the field means the field, even when its URL is also in the list: the jump back to
    // the saved row happens on the next open, because this latch lives as long as the popover does.
    it('should outline the field once it is reached into, saved URL or not', () => {
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        expect(screen.getByTestId(`pick-cluster-${CUSTOM_URL}`)).toHaveAttribute('aria-current', 'true');
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        // The plate is what wears the outline — the field is the design system's, untouched.
        expect(screen.getByTestId('custom-field-plate')).toHaveClass('border-white/10');
        expect(screen.getByTestId(`pick-cluster-${CUSTOM_URL}`)).not.toHaveAttribute('aria-current');
    });

    // The one time a reader is looking straight at the field: they arrived from a shipping cluster and
    // clicked into it. Gated on the cluster, the outline appeared only when the typing pause committed.
    it('should outline the field on focus even from a shipping cluster', () => {
        clusterMock.onCustom = false;
        renderBody();
        expect(screen.getByTestId('custom-field-plate')).not.toHaveClass('border-white/10');
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        expect(screen.getByTestId('custom-field-plate')).toHaveClass('border-white/10');
    });

    it('should hand the outline back to the saved row on the next open', () => {
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        // A fresh render is what reopening the popover does: Radix unmounts the body when it closes.
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        expect(screen.getAllByTestId('custom-field-plate').at(-1)).not.toHaveClass('border-white/10');
    });

    // Saving hands the endpoint to the list and the cursor with it: the row that appears opens its name
    // field, so the address field stops being the chosen thing.
    it('should let go of the outline when an endpoint is saved', () => {
        renderBody();
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        expect(screen.getByTestId('custom-field-plate')).toHaveClass('border-white/10');
        fireEvent.click(screen.getByTestId('save-custom-cluster-btn'));
        expect(screen.getByTestId(`rename-cluster-input-${CUSTOM_URL}`)).toBeInTheDocument();
        expect(screen.getByTestId('custom-field-plate')).not.toHaveClass('border-white/10');
    });

    it('should take the outline and the cursor back when the naming is dismissed', () => {
        renderBody();
        fireEvent.click(screen.getByTestId('save-custom-cluster-btn'));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByTestId('custom-field-plate')).toHaveClass('border-white/10');
        expect(screen.getByTestId('custom-url-omnibox')).toHaveFocus();
    });

    it('should keep the outline off once the name is committed', () => {
        renderBody();
        fireEvent.click(screen.getByTestId('save-custom-cluster-btn'));
        fireEvent.click(screen.getByTestId(`confirm-rename-cluster-${CUSTOM_URL}`));
        expect(screen.getByTestId('custom-field-plate')).not.toHaveClass('border-white/10');
    });

    // As in v3.4: the connection is on the control that opens the menu, not repeated inside it.
    it('should not state the connection anywhere inside the menu', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        expect(screen.queryByText('not connected')).not.toBeInTheDocument();
    });

    // Both halves of an entry are editable: a typo in the address used to mean deleting it and saving
    // the endpoint again from the field.
    it('should head the edit form with what it edits', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        fireEvent.click(screen.getByTestId(`rename-cluster-${OTHER_URL}`));
        expect(screen.getByText('Edit endpoint name and address')).toBeInTheDocument();
    });

    it('should edit the name and the address of a saved endpoint', () => {
        const { store } = renderBody([{ name: 'Staging', url: OTHER_URL }]);
        fireEvent.click(screen.getByTestId(`rename-cluster-${OTHER_URL}`));
        fireEvent.change(screen.getByTestId(`rename-cluster-input-${OTHER_URL}`), {
            target: { value: 'Staging box' },
        });
        fireEvent.change(screen.getByTestId(`edit-cluster-url-${OTHER_URL}`), {
            target: { value: 'https://staging-2.example.com' },
        });
        fireEvent.click(screen.getByTestId(`confirm-rename-cluster-${OTHER_URL}`));
        expect(store.get(savedClustersAtom)).toEqual([{ name: 'Staging box', url: 'https://staging-2.example.com' }]);
    });

    it('should keep the edit open and say why when the address is refused', () => {
        renderBody([
            { name: 'Staging', url: OTHER_URL },
            { name: 'Local', url: 'http://localhost:8899' },
        ]);
        fireEvent.click(screen.getByTestId(`rename-cluster-${OTHER_URL}`));
        fireEvent.change(screen.getByTestId(`edit-cluster-url-${OTHER_URL}`), {
            target: { value: 'http://localhost:8899' },
        });
        fireEvent.click(screen.getByTestId(`confirm-rename-cluster-${OTHER_URL}`));
        expect(screen.getByTestId(`rename-cluster-error-${OTHER_URL}`)).toHaveTextContent('that address');
        expect(screen.getByTestId(`edit-cluster-url-${OTHER_URL}`)).toBeInTheDocument();
    });
});
