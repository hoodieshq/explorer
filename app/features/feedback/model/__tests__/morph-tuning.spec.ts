import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('morph tuning', () => {
    beforeEach(() => {
        localStorage.clear();
        // The store caches what it read; each test starts from a fresh module.
        vi.resetModules();
    });

    it('should start from the defaults', async () => {
        const { getMorphTuning, MORPH_TUNING_DEFAULTS } = await import('../morph-tuning');

        expect(getMorphTuning()).toEqual(MORPH_TUNING_DEFAULTS);
    });

    it('should keep a changed segment across a reload', async () => {
        const first = await import('../morph-tuning');
        first.setMorphSegment('hit', { easing: [0.1, 0.2, 0.3, 0.4], ms: 250 });
        vi.resetModules();

        const { getMorphTuning } = await import('../morph-tuning');
        expect(getMorphTuning().hit).toEqual({ easing: [0.1, 0.2, 0.3, 0.4], ms: 250 });
    });

    it('should go back to the defaults on reset', async () => {
        const { getMorphTuning, MORPH_TUNING_DEFAULTS, resetMorphTuning, setMorphSegment } =
            await import('../morph-tuning');
        setMorphSegment('fold', { easing: [0, 0, 1, 1], ms: 10 });
        resetMorphTuning();

        expect(getMorphTuning()).toEqual(MORPH_TUNING_DEFAULTS);
    });

    it('should ignore a stored value of another shape', async () => {
        localStorage.setItem('hoo-1815:morph-tuning', JSON.stringify({ fold: { ms: 'slow' } }));
        const { getMorphTuning, MORPH_TUNING_DEFAULTS } = await import('../morph-tuning');

        expect(getMorphTuning()).toEqual(MORPH_TUNING_DEFAULTS);
    });

    it('should write the easing as CSS', async () => {
        const { cubicBezierCss } = await import('../morph-tuning');

        expect(cubicBezierCss([0.5, 0, 1, 0.6])).toBe('cubic-bezier(0.5, 0, 1, 0.6)');
    });
});
