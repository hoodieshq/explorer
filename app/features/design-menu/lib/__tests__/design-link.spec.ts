// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { applyDesignLink, designLinkHref } from '../design-link';

const PAGE = 'http://localhost/address/abc?cluster=devnet';

describe('design link', () => {
    afterEach(() => {
        window.localStorage.clear();
        window.history.replaceState(null, '', '/');
    });

    it('should put every choice in the design parameter', () => {
        const href = designLinkHref(['card', 'current', 'stretch', 'proxy'], PAGE);

        expect(new URL(href).searchParams.get('design')).toBe('card.current.stretch.proxy');
        expect(new URL(href).searchParams.get('cluster')).toBe('devnet');
    });

    it('should write the linked choices over the stored ones and take the parameter off', () => {
        window.localStorage.setItem('hoo-929:nftoken-header', '"split"');
        window.history.replaceState(null, '', '/address/abc?cluster=devnet&design=card.current.stretch.proxy');

        applyDesignLink();

        expect(window.localStorage.getItem('hoo-929:nftoken-header')).toBe('"card"');
        expect(window.localStorage.getItem('hoo-929:original-link')).toBe('"current"');
        expect(window.localStorage.getItem('hoo-929:card-spacing')).toBe('"stretch"');
        expect(window.localStorage.getItem('hoo-929:metadata-proxy')).toBe('true');
        expect(window.location.search).toBe('?cluster=devnet');
    });

    it('should skip a part that is not one of its values', () => {
        window.localStorage.setItem('hoo-929:original-link', '"row"');
        window.history.replaceState(null, '', '/?design=plain.sideways');

        applyDesignLink();

        expect(window.localStorage.getItem('hoo-929:nftoken-header')).toBe('"plain"');
        expect(window.localStorage.getItem('hoo-929:original-link')).toBe('"row"');
    });

    it('should leave the storage alone without a design parameter', () => {
        window.history.replaceState(null, '', '/?cluster=devnet');

        applyDesignLink();

        expect(window.localStorage.length).toBe(0);
    });
});
