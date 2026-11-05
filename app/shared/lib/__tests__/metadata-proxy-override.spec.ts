// @vitest-environment jsdom
import { vi } from 'vitest';

import { getProxiedUri } from '../metadata-proxy';
import { readMetadataProxyOverride } from '../metadata-proxy-override';

const STORAGE_KEY = 'hoo-921:metadata-proxy';
const URI = 'https://example.com/meta.json';
const PROXIED = `/api/metadata/proxy?uri=${encodeURIComponent(URI)}`;

describe('metadata proxy override', () => {
    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllEnvs();
    });

    it('should leave the choice to the deploy when nothing is stored', () => {
        vi.stubEnv('NEXT_PUBLIC_METADATA_ENABLED', 'true');
        expect(readMetadataProxyOverride()).toBeUndefined();
        expect(getProxiedUri(URI)).toBe(PROXIED);
    });

    it('should bypass a proxy the deploy turned on', () => {
        vi.stubEnv('NEXT_PUBLIC_METADATA_ENABLED', 'true');
        window.localStorage.setItem(STORAGE_KEY, 'false');
        expect(getProxiedUri(URI)).toBe(URI);
    });

    it('should use a proxy the deploy turned off', () => {
        vi.stubEnv('NEXT_PUBLIC_METADATA_ENABLED', 'false');
        window.localStorage.setItem(STORAGE_KEY, 'true');
        expect(getProxiedUri(URI)).toBe(PROXIED);
    });

    it('should ignore a stored value that is not a boolean', () => {
        window.localStorage.setItem(STORAGE_KEY, '"on"');
        expect(readMetadataProxyOverride()).toBeUndefined();
        window.localStorage.setItem(STORAGE_KEY, '{broken');
        expect(readMetadataProxyOverride()).toBeUndefined();
    });
});
