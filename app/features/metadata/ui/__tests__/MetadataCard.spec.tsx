import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import type { Account } from '@/app/providers/accounts';

import {
    getMockAccountWithCompressedNft,
    getMockAccountWithNFTData,
    getMockAccountWithTokenMetadata,
    getMockAccountWithTokenMetadataAndMetaplexMetadata,
} from '../../mocks';
import { MetadataCard } from '../MetadataCard';

vi.mock('@/app/components/common/JsonViewer', () => ({
    JsonViewer: ({ src }: { src: any }) => <div data-testid="json-viewer">{JSON.stringify(src, null, 2)}</div>,
}));

vi.mock('../../model/useOffChainMetadata', () => ({
    useOffChainMetadata: vi.fn(() => ({
        metadata: {
            description: 'Cinematic shots of BR1: Operatives getting ready for battle.',
        },
    })),
}));

describe('MetadataCard', () => {
    it('should render a Metaplex section when account has metaplex metadata', () => {
        const { account, getJsonViewer } = setup('metaplexMetadata');
        render(<MetadataCard account={account} />);

        expect(screen.getByText('Metaplex')).toBeInTheDocument();
        expect(getJsonViewer()).toHaveTextContent('USD Coin');
    });

    it('should render a token metadata section when account has token metadata', () => {
        const { account, getJsonViewer } = setup('tokenMetadata');
        render(<MetadataCard account={account} />);
        expect(screen.getByText('Token extension')).toBeInTheDocument();
        expect(getJsonViewer()).toHaveTextContent('PayPal USD');
    });

    it('should render two sections when account has token metadata and metaplex metadata', () => {
        const { account } = setup('tokenMetadataAndMetaplexMetadata');
        render(<MetadataCard account={account} />);
        expect(screen.getByText('Metaplex')).toBeInTheDocument();
        expect(screen.getByText('Token extension')).toBeInTheDocument();
    });

    it('should add the design menu mock Metaplex source to token metadata by default', async () => {
        const { account } = setup('tokenMetadata');
        render(<MetadataCard account={account} />);

        expect(await screen.findByRole('tab', { name: 'Metaplex (mock)' })).toBeInTheDocument();
    });

    it('should leave the mock Metaplex source out once the design menu switches it off', async () => {
        localStorage.setItem('hoo-928:mock-metaplex', 'false');
        const { account } = setup('tokenMetadata');
        render(<MetadataCard account={account} />);

        expect(await screen.findByText('Token extension')).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: 'Metaplex (mock)' })).not.toBeInTheDocument();
        localStorage.removeItem('hoo-928:mock-metaplex');
    });

    it('should render a compressed NFT section when account has compressed NFT', () => {
        const { account, getJsonViewer } = setup('compressedNft');
        render(<MetadataCard account={account} />);
        expect(screen.getByText('Compressed NFT Metadata')).toBeInTheDocument();
        expect(getJsonViewer()).toHaveTextContent('Cinematic shots of BR1: Operatives getting ready for battle');
    });
});

function setup(variant: 'metaplexMetadata' | 'tokenMetadata' | 'compressedNft' | 'tokenMetadataAndMetaplexMetadata'): {
    account: Account;
    getJsonViewer: () => HTMLElement;
} {
    const getJsonViewer = () => screen.getByTestId('json-viewer');

    const account = (() => {
        switch (variant) {
            case 'metaplexMetadata':
                return getMockAccountWithNFTData();
            case 'tokenMetadata':
                return getMockAccountWithTokenMetadata();
            case 'compressedNft':
                return getMockAccountWithCompressedNft();
            case 'tokenMetadataAndMetaplexMetadata':
                return getMockAccountWithTokenMetadataAndMetaplexMetadata();
        }
    })();

    return { account, getJsonViewer };
}
