import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseTokenInstructionsCard } from '../BaseTokenInstructionsCard';
import { INSTRUCTION_ROWS } from './TokenInstructionsCard.fixtures';

const meta = {
    component: BaseTokenInstructionsCard,
    decorators: [withCluster, withTokenInfoBatch, withViewportFromGlobal],
    parameters: {
        ...nextjsParameters,
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/History/TokenInstructionsCard@Media',
} satisfies Meta<typeof BaseTokenInstructionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    fetching: false,
    foundOldest: false,
    onLoadMore: () => {},
    onRefresh: () => {},
    rows: INSTRUCTION_ROWS,
};

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
