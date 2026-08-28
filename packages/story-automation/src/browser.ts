import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { type Browser, type BrowserType, chromium, firefox, webkit } from 'playwright';

export type EngineName = 'chromium' | 'firefox' | 'webkit';

/** A launchable browser plus the build id that scopes its baselines — rendered pixels differ per engine and per build. */
export interface BrowserProvider {
    name: string;
    launch(): Promise<Browser>;
    revision(): string;
}

const ENGINES: Record<EngineName, BrowserType> = { chromium, firefox, webkit };

export const ENGINE_NAMES: EngineName[] = ['chromium', 'firefox', 'webkit'];

export function isEngineName(value: string): value is EngineName {
    return value in ENGINES;
}

/** Reads the bundled build revision for one engine; playwright's own version does not track it. */
export function engineRevision(engine: EngineName): string {
    const requireHere = createRequire(import.meta.url);
    const requireFromPlaywright = createRequire(requireHere.resolve('playwright/package.json'));
    // browsers.json is not in playwright-core's exports map — locate the package root via its main entry
    const coreRoot = dirname(requireFromPlaywright.resolve('playwright-core'));
    const manifest: { browsers: { name: string; revision: string }[] } = JSON.parse(
        readFileSync(join(coreRoot, 'browsers.json'), 'utf8'),
    );
    const entry = manifest.browsers.find(browser => browser.name === engine);
    if (!entry) throw new Error(`${engine} entry missing from playwright-core/browsers.json`);
    return entry.revision;
}

export function playwrightProvider(engine: EngineName = 'chromium'): BrowserProvider {
    return {
        launch: () => ENGINES[engine].launch({ headless: true }),
        name: engine,
        revision: () => engineRevision(engine),
    };
}
