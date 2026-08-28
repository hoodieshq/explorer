import { describe, expect, it } from 'vitest';

import { ENGINE_NAMES, engineRevision, isEngineName, playwrightProvider } from './browser.js';

describe('isEngineName', () => {
    it('should accept every advertised engine', () => {
        for (const name of ENGINE_NAMES) expect(isEngineName(name)).toBe(true);
    });

    it('should reject an unknown engine', () => {
        expect(isEngineName('edge')).toBe(false);
    });
});

describe('engineRevision', () => {
    it('should read a numeric build revision for each engine', () => {
        for (const name of ENGINE_NAMES) expect(Number(engineRevision(name))).toBeGreaterThan(0);
    });

    it('should differ between engines so baselines cannot be shared', () => {
        expect(engineRevision('chromium')).not.toBe(engineRevision('firefox'));
    });
});

describe('playwrightProvider', () => {
    it('should default to chromium', () => {
        expect(playwrightProvider().name).toBe('chromium');
    });

    it('should carry the engine name and its revision', () => {
        const provider = playwrightProvider('firefox');
        expect(provider.name).toBe('firefox');
        expect(provider.revision()).toBe(engineRevision('firefox'));
    });
});
