import { fireEvent, render, screen, within } from '@testing-library/react';
import { Cluster, ClusterStatus } from '@utils/cluster';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SavedCluster, savedClustersAtom } from '@/app/features/cluster-switcher/lib/cluster-storage';

const CUSTOM_URL = 'http://my-validator:8899';
const KNOWN_TITLE = 'A known endpoint — one this deployment ships with or vouches for';
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

// `onCustom` rather than a `Cluster` value: this object is hoisted above the imports, so the enum is not
// in scope where it is created.
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

import { ClusterFieldFirstBody } from '../ClusterFieldFirstBody';

function renderBody(saved: SavedCluster[] = []) {
    const store = createStore();
    if (saved.length > 0) store.set(savedClustersAtom, saved);
    return {
        store,
        ...render(
            <Provider store={store}>
                <ClusterFieldFirstBody />
            </Provider>,
        ),
    };
}

describe('ClusterFieldFirstBody (v3.4)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        clusterMock.customUrl = CUSTOM_URL;
        clusterMock.onCustom = true;
        nav.searchParams = new URLSearchParams(`cluster=custom&customUrl=${CUSTOM_URL}`);
    });

    it('should keep the endpoint field up with nothing to unfold first', () => {
        renderBody();
        expect(screen.getByTestId('custom-url-omnibox')).toHaveValue(CUSTOM_URL);
    });

    // It is still a choice — that is what puts the app on the endpoint in the field — and the field lives
    // inside its plate rather than under it.
    it('should offer Custom as a row that can be chosen', () => {
        renderBody();
        expect(screen.getByTestId('custom-cluster-row')).toBeInTheDocument();
    });

    it('should still list the shipping clusters', () => {
        renderBody();
        expect(screen.getByRole('link', { name: 'Mainnet Beta' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Devnet' })).toBeInTheDocument();
    });

    // The kept endpoints belong to that group; a caption of their own put them on the level of the two
    // subjects of the menu.
    it('should list the saved endpoints without a heading of their own', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        expect(screen.getByTestId('saved-clusters-section')).toBeInTheDocument();
        expect(screen.queryByText('Saved endpoints')).not.toBeInTheDocument();
    });

    it('should load a saved endpoint into the field', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        fireEvent.click(screen.getByTestId(`pick-cluster-${OTHER_URL}`));
        expect(screen.getByTestId('custom-url-omnibox')).toHaveValue(OTHER_URL);
    });

    // The connection lives on the control that opens this menu, which is on screen the whole time.
    // Inside, it was the same fact in a second place — and it moved as the selection did.
    it('should not state the connection anywhere inside the menu', () => {
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        expect(screen.queryByText('not connected')).not.toBeInTheDocument();
    });

    // The tick means the app knows the endpoint: one it ships with, or a host on the deployment's
    // whitelist.
    it('should tick a saved endpoint on the deployment’s whitelist', () => {
        vi.stubEnv('NEXT_PUBLIC_WHITELISTED_RPCS', 'rpc.example.com');
        renderBody([{ name: 'Provider', url: 'https://rpc.example.com' }]);
        // Scoped to the list: the clusters above carry the same mark, which is the point of it.
        expect(within(screen.getByTestId('saved-clusters-section')).getByTitle(KNOWN_TITLE)).toBeInTheDocument();
        vi.unstubAllEnvs();
    });

    // Reaching your own machine needs no consent, which is a fact about reach rather than about trust: a
    // validator on your desk is yours, not vetted.
    it('should leave a local endpoint unticked', () => {
        renderBody([{ name: 'Local', url: 'http://localhost:8899' }]);
        expect(within(screen.getByTestId('saved-clusters-section')).queryByTitle(KNOWN_TITLE)).not.toBeInTheDocument();
    });

    it('should leave an endpoint the app has never heard of unticked', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        expect(within(screen.getByTestId('saved-clusters-section')).queryByTitle(KNOWN_TITLE)).not.toBeInTheDocument();
    });

    // Every cluster the app ships with is known by definition, so every one of them carries the mark.
    it('should mark every shipping cluster as known', () => {
        renderBody();
        expect(screen.getAllByTitle(KNOWN_TITLE).length).toBeGreaterThan(2);
    });

    // Choosing a saved endpoint is choosing *it*: lighting Custom as well said the app was on two things
    // at once.
    it('should not light the Custom plate while a saved endpoint is the one in use', () => {
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        expect(screen.getByTestId('custom-cluster-row')).not.toHaveAttribute('aria-current');
        expect(screen.getByTestId(`pick-cluster-${CUSTOM_URL}`)).toHaveAttribute('aria-current', 'true');
    });

    it('should light it for an endpoint that is not in the list', () => {
        renderBody();
        expect(screen.getByTestId('custom-cluster-row')).toHaveAttribute('aria-current', 'true');
    });

    // Reaching into the field is saying you mean the field, whatever the list holds.
    it('should light it once the field is reached into, saved URL or not', () => {
        renderBody([{ name: 'My validator', url: CUSTOM_URL }]);
        fireEvent.focus(screen.getByTestId('custom-url-omnibox'));
        expect(screen.getByTestId('custom-cluster-row')).toHaveAttribute('aria-current', 'true');
        expect(screen.getByTestId(`pick-cluster-${CUSTOM_URL}`)).not.toHaveAttribute('aria-current');
    });

    // Nothing is drawn in the field: the only thing that mark could say is "vouched for", and an address
    // being typed is not that yet.
    it('should draw no mark inside the field', () => {
        clusterMock.customUrl = 'http://localhost:8899';
        renderBody();
        expect(screen.queryByTitle('Your own machine')).not.toBeInTheDocument();
    });

    // Equipment for the row above, not a second set of choices of equal standing.
    it('should set the saved list a step quieter than the clusters', () => {
        renderBody([{ name: 'Staging', url: OTHER_URL }]);
        expect(screen.getByText('Staging')).toHaveClass('text-outer-space-200');
        expect(screen.getByRole('link', { name: 'Mainnet Beta' })).toHaveClass('text-white');
    });
});
