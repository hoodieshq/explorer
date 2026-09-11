import { SearchBar } from '@features/search';
import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { NavbarV17 } from '../NavbarV17';

/**
 * Variant 3.3 across the breakpoints it was drawn against: the search field is a square button below `sm`
 * and a docked field from there up, and the network control's width steps with it, so the row only reads
 * correctly when seen at each width.
 */
const meta: Meta = {
    decorators: [withCluster, withViewportFromGlobal],
    parameters: {
        ...nextjsParameters,
        docs: { story: { height: '120px' } },
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Navbar Variants@Media',
};

export default meta;
type Story = StoryObj;

const render = () => (
    <NavbarV17>
        <SearchBar />
    </NavbarV17>
);

export const Mobile: Story = {
    globals: { viewport: { value: 'iphonex' } },
    render,
};

export const TabletPortrait: Story = {
    globals: { viewport: { value: 'ipad' } },
    render,
};

export const TabletLandscape: Story = {
    globals: { viewport: { isRotated: true, value: 'ipad' } },
    render,
};
