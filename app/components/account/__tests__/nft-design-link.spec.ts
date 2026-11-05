// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { applyDesignLink, designLinkHref } from '../nft-design-link';

const PAGE = 'http://localhost/address/abc?cluster=devnet';

describe('design link', () => {
    afterEach(() => {
        window.localStorage.clear();
        window.history.replaceState(null, '', '/');
    });

    it('should put every choice in the design parameter', () => {
        const href = designLinkHref(['card', 'current', 'stretch', 'header', 'icon', 'column', 'proxy'], PAGE);

        expect(new URL(href).searchParams.get('design')).toBe('card.current.stretch.header.icon.column.proxy');
        expect(new URL(href).searchParams.get('cluster')).toBe('devnet');
    });

    it('should write the linked choices over the stored ones and take the parameter off', () => {
        window.localStorage.setItem('hoo-921:nft-header', '"split"');
        window.history.replaceState(
            null,
            '',
            '/address/abc?cluster=devnet&design=card.current.stretch.header.icon.column.proxy',
        );

        applyDesignLink();

        expect(window.localStorage.getItem('hoo-921:nft-header')).toBe('"card"');
        expect(window.localStorage.getItem('hoo-921:original-link')).toBe('"current"');
        expect(window.localStorage.getItem('hoo-921:card-spacing')).toBe('"stretch"');
        expect(window.localStorage.getItem('hoo-921:creators-placement')).toBe('"header"');
        expect(window.localStorage.getItem('hoo-921:creators-unverified')).toBe('"icon"');
        expect(window.localStorage.getItem('hoo-921:creators-share')).toBe('"column"');
        expect(window.localStorage.getItem('hoo-921:metadata-proxy')).toBe('true');
        expect(window.location.search).toBe('?cluster=devnet');
    });

    it('should skip a part that is not one of its values', () => {
        window.localStorage.setItem('hoo-921:original-link', '"row"');
        window.history.replaceState(null, '', '/?design=wideArt.sideways');

        applyDesignLink();

        expect(window.localStorage.getItem('hoo-921:nft-header')).toBe('"wideArt"');
        expect(window.localStorage.getItem('hoo-921:original-link')).toBe('"row"');
    });

    it('should leave the storage alone without a design parameter', () => {
        window.history.replaceState(null, '', '/?cluster=devnet');

        applyDesignLink();

        expect(window.localStorage.length).toBe(0);
    });
});
