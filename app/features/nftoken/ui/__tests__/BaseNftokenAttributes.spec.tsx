import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BaseNftokenAttributes } from '../BaseNftokenAttributes';

vi.mock('@components/common/KitAddress', () => ({
    KitAddress: ({ address }: { address: string }) => <span data-testid="address">{address}</span>,
}));
vi.mock('@components/shared/ui/timestamp', () => ({
    Timestamp: ({ unixTimestamp }: { unixTimestamp: number }) => <span data-testid="timestamp">{unixTimestamp}</span>,
}));

const MINTER = '7kZ1h2mnwyhP3sKz8JgVdMmaMPswk3FuomTkPEnvRN8t';

describe('BaseNftokenAttributes', () => {
    it('should show an address value with the address component', () => {
        render(<BaseNftokenAttributes traits={[{ type: 'Minted By', value: MINTER }]} />);

        expect(screen.getByTestId('address')).toHaveTextContent(MINTER);
    });

    it('should show an ISO timestamp value with the timestamp component, in Unix seconds', () => {
        render(<BaseNftokenAttributes traits={[{ type: 'Minted At', value: '2022-07-09T21:48:18.722Z' }]} />);

        expect(screen.getByTestId('timestamp')).toHaveTextContent('1657403298');
    });

    it.each([
        ['a word', 'friends'],
        ['a number', '3'],
        ['a year', '2022'],
        ['a date without a time', '2022-07-09'],
    ])('should show %s as text', (_, value) => {
        render(<BaseNftokenAttributes traits={[{ type: 'Trait', value }]} />);

        expect(screen.getByText(value)).toBeInTheDocument();
        expect(screen.queryByTestId('address')).not.toBeInTheDocument();
        expect(screen.queryByTestId('timestamp')).not.toBeInTheDocument();
    });

    it('should say there are no attributes for an empty list', () => {
        render(<BaseNftokenAttributes traits={[]} />);

        expect(screen.getByText('No attributes')).toBeInTheDocument();
    });
});
