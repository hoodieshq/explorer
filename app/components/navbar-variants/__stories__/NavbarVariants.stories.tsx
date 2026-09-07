import { SearchBar } from '@features/search';
import { nextjsParameters, withCluster, withClusterState } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { Cluster, ClusterStatus } from '@utils/cluster';

import { NavbarV17 } from '../NavbarV17';
import { SHIPPING_NAV_VARIANT } from '../registry';

/**
 * The design-review variants, mounted directly rather than through `Navbar`. That entry point answers to a
 * flag and to a stored id — the switcher's — so a story going through it would show whichever variant the
 * last review session left behind. These name their component instead.
 *
 * The search bar comes in as `children` exactly as the layout passes it, since the field is most of what
 * these variants differ about.
 */
const meta: Meta = {
    decorators: [withCluster],
    parameters: {
        ...nextjsParameters,
        // The bar plus the room its focus glow spills into.
        docs: { story: { height: '96px' } },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Navbar Variants',
};

export default meta;
type Story = StoryObj;

const Shipping = SHIPPING_NAV_VARIANT.Component;

/**
 * Whatever `DEFAULT_NAV_VARIANT` names — the navbar the app renders with the review flag off. Follows the
 * registry, so it keeps showing the shipping layout after the default moves on.
 */
export const Current: Story = {
    render: () => (
        <Shipping>
            <SearchBar />
        </Shipping>
    ),
};

/**
 * Variant 3.3 by name, so it stays this variant whatever ships. The network control says its two facts as
 * words — the provenance ahead of the endpoint's name, the connection's state underneath — and the search
 * field carries the aurora and the graded rule.
 */
export const Variant33: Story = {
    render: () => (
        <NavbarV17>
            <SearchBar />
        </NavbarV17>
    ),
};

/** The same, on an endpoint the app does not know: the provenance reads `unknown`, in its own colour. */
export const Variant33CustomRpc: Story = {
    decorators: [
        withClusterState({
            cluster: Cluster.Custom,
            customUrl: 'https://random-helius-fast-mainnet.helius-rpc.com',
            status: ClusterStatus.Connected,
        }),
    ],
    render: Variant33.render,
};
