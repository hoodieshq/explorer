import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { createTokenMarketStats } from '../../__tests__/__fixtures__/market-data';
import { TokenMarketDataStatus } from '../../lib/types';
import { TokenMarketData } from '../TokenMarketData';

const meta = {
    component: TokenMarketData,
    tags: ['autodocs', 'test'],
    title: 'Features/TokenMarketData/UI/TokenMarketData',
} satisfies Meta<typeof TokenMarketData>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: { marketData: { stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success } },
    async play({ canvasElement }) {
        expect.assertions(1);
        expect(within(canvasElement).queryAllByLabelText('market-data')).toHaveLength(3);
    },
};

export const Loading: Story = {
    args: { marketData: { stats: undefined, status: TokenMarketDataStatus.Loading } },
    async play({ canvasElement }) {
        expect.assertions(1);
        expect(within(canvasElement).getByText('Loading token price data')).toBeInTheDocument();
    },
};
