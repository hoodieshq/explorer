import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BaseNftokenHeader } from '../BaseNftokenHeader';

const COLLECTION = 'D2VpbKpT725tdQyaNNZZwwS7Mqzgw4SZb2o4az5wA9vr';
const IMAGE = 'https://cdn.glow.app/g/5e/rwwih1nsp8.png';

describe('BaseNftokenHeader', () => {
    it('should show the type label but no name while the metadata loads', () => {
        render(<BaseNftokenHeader kind="collection" metadata={{ kind: 'loading' }} />);

        expect(screen.getByText('NFToken Collection')).toBeInTheDocument();
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it.each([
        ['nft', 'NFToken NFT'],
        ['collection', 'NFToken Collection'],
    ] as const)('should show the name from the metadata under the %s label', (kind, label) => {
        render(
            <BaseNftokenHeader
                kind={kind}
                metadata={{ kind: 'loaded', metadata: { image: undefined, name: 'Genesis: friends.glow' } }}
            />,
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Genesis: friends.glow' })).toBeInTheDocument();
    });

    it('should offer the original image from the metadata', () => {
        render(
            <BaseNftokenHeader kind="nft" metadata={{ kind: 'loaded', metadata: { image: IMAGE, name: 'Genesis' } }} />,
        );

        // One link for phones under the art, one for wider screens in its own row; CSS shows one of them.
        expect(screen.getAllByRole('button', { name: 'View original' })).toHaveLength(2);
    });

    it('should not offer an original image that is not an http(s) address', () => {
        render(
            <BaseNftokenHeader
                kind="nft"
                metadata={{ kind: 'loaded', metadata: { image: 'javascript:alert(1)', name: 'Genesis' } }}
            />,
        );

        expect(screen.queryByRole('button', { name: 'View original' })).not.toBeInTheDocument();
    });

    it.each([
        ['nft', 'Unnamed NFT'],
        ['collection', 'Unnamed collection'],
    ] as const)('should show the missing-name text for kind %s with unavailable metadata', (kind, text) => {
        render(<BaseNftokenHeader kind={kind} metadata={{ kind: 'unavailable' }} />);

        expect(screen.getByRole('heading', { name: text })).toBeInTheDocument();
    });

    it.each(['nft', 'collection'] as const)('should report failed metadata for kind %s', kind => {
        render(<BaseNftokenHeader kind={kind} metadata={{ kind: 'failed' }} />);

        expect(screen.getByRole('heading', { name: 'Failed to load metadata' })).toBeInTheDocument();
    });

    it('should count every NFT account of a collection, including the ones that do not decode', () => {
        render(
            <BaseNftokenHeader
                kind="collection"
                metadata={{ kind: 'unavailable' }}
                nfts={{ kind: 'loaded', nfts: [], refreshFailed: false, refreshing: false, undecodableCount: 3 }}
            />,
        );

        expect(screen.getByText('Number of NFTs')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show the number of NFTs while the collection metadata still loads', () => {
        render(
            <BaseNftokenHeader
                kind="collection"
                metadata={{ kind: 'loading' }}
                nfts={{ kind: 'loaded', nfts: [], refreshFailed: false, refreshing: false, undecodableCount: 2 }}
            />,
        );

        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show no number while the NFTs of a collection load', () => {
        render(<BaseNftokenHeader kind="collection" metadata={{ kind: 'unavailable' }} nfts={{ kind: 'loading' }} />);

        // The value cell holds only the skeleton.
        expect(screen.getByText('Number of NFTs')).toBeInTheDocument();
        expect(screen.getByRole('definition').textContent).toBe('');
    });

    it('should link the collection of an NFT by its name', () => {
        render(
            <BaseNftokenHeader
                kind="nft"
                metadata={{ kind: 'unavailable' }}
                collection={{ address: COLLECTION, href: '/address/collection', name: 'Genesis' }}
            />,
        );

        expect(screen.getByRole('link', { name: 'Genesis' })).toHaveAttribute('href', '/address/collection');
    });

    it('should link the short address of a collection whose name has not loaded', () => {
        render(
            <BaseNftokenHeader
                kind="nft"
                metadata={{ kind: 'unavailable' }}
                collection={{ address: COLLECTION, href: '/address/collection' }}
            />,
        );

        expect(screen.getByRole('link', { name: 'D2Vp…A9vr' })).toBeInTheDocument();
    });

    it('should show a dash for an NFT outside any collection', () => {
        render(<BaseNftokenHeader kind="nft" metadata={{ kind: 'unavailable' }} />);

        expect(screen.getByText('Collection')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should show no number of NFTs for an NFT', () => {
        render(<BaseNftokenHeader kind="nft" metadata={{ kind: 'unavailable' }} />);

        expect(screen.queryByText('Number of NFTs')).not.toBeInTheDocument();
    });

    it('should show the description from the metadata', () => {
        render(
            <BaseNftokenHeader
                kind="collection"
                metadata={{
                    kind: 'loaded',
                    metadata: { description: 'The Genesis collection.', image: undefined, name: 'A' },
                }}
            />,
        );

        expect(screen.getByText('The Genesis collection.')).toBeInTheDocument();
    });

    it('should leave the mutability to the Overview card', () => {
        render(<BaseNftokenHeader kind="collection" metadata={{ kind: 'unavailable' }} />);

        expect(screen.queryByText('Mutable')).not.toBeInTheDocument();
        expect(screen.queryByText('Immutable')).not.toBeInTheDocument();
    });
});
