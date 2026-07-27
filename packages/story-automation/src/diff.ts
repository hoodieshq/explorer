import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface DriftEntry {
    id: string;
    /** -1 when the dimensions differ and pixels cannot be counted */
    pixels: number;
    pct: number;
    reason?: 'dim-mismatch';
}

export interface DiffResult {
    compared: number;
    /** drift outside the allowlists — the failure signal */
    drift: DriftEntry[];
    /** drift on allowlisted stories — reported, never failing */
    allowedDrift: DriftEntry[];
    /** current-only stories (info, not drift) */
    added: string[];
    /** baseline-only stories (info, not drift) */
    removed: string[];
}

export interface DiffOptions {
    baselineDir: string;
    currentDir: string;
    /** when set, non-allowlisted drifted stories get {id}.baseline/.current/.diff PNG triplets written here */
    tripletDir?: string;
    allowlist?: Set<string>;
    threshold?: number;
}

export function loadAllowlists(files: string[]): Set<string> {
    const ids = new Set<string>();
    for (const file of files) {
        const parsed: { ids?: string[] } = JSON.parse(readFileSync(file, 'utf8'));
        for (const id of parsed.ids ?? []) ids.add(id);
    }
    return ids;
}

function pngIds(dir: string): Set<string> {
    return new Set(
        readdirSync(dir)
            .filter(file => file.endsWith('.png'))
            .map(file => file.slice(0, -'.png'.length)),
    );
}

function writeTriplet(options: DiffOptions, id: string, diffPng?: PNG): void {
    if (!options.tripletDir) return;
    mkdirSync(options.tripletDir, { recursive: true });
    copyFileSync(join(options.baselineDir, `${id}.png`), join(options.tripletDir, `${id}.baseline.png`));
    copyFileSync(join(options.currentDir, `${id}.png`), join(options.tripletDir, `${id}.current.png`));
    if (diffPng) writeFileSync(join(options.tripletDir, `${id}.diff.png`), PNG.sync.write(diffPng));
}

/** Pixel-compares every same-named PNG across two directories; pixelmatch settings match the dashkit-removal rig. */
export function diffDirectories(options: DiffOptions): DiffResult {
    const allowlist = options.allowlist ?? new Set<string>();
    const baselineIds = pngIds(options.baselineDir);
    const currentIds = pngIds(options.currentDir);
    const added = [...currentIds].filter(id => !baselineIds.has(id)).sort();
    const removed = [...baselineIds].filter(id => !currentIds.has(id)).sort();

    const drift: DriftEntry[] = [];
    const allowedDrift: DriftEntry[] = [];
    let compared = 0;
    for (const id of [...baselineIds].filter(candidate => currentIds.has(candidate)).sort()) {
        const baseline = PNG.sync.read(readFileSync(join(options.baselineDir, `${id}.png`)));
        const current = PNG.sync.read(readFileSync(join(options.currentDir, `${id}.png`)));
        compared++;
        const bucket = allowlist.has(id) ? allowedDrift : drift;
        if (baseline.width !== current.width || baseline.height !== current.height) {
            bucket.push({ id, pct: 0, pixels: -1, reason: 'dim-mismatch' });
            if (bucket === drift) writeTriplet(options, id);
            continue;
        }
        const diffPng = new PNG({ height: baseline.height, width: baseline.width });
        const pixels = pixelmatch(baseline.data, current.data, diffPng.data, baseline.width, baseline.height, {
            includeAA: false,
            threshold: options.threshold ?? 0.05,
        });
        if (pixels > 0) {
            const pct = +((100 * pixels) / (baseline.width * baseline.height)).toFixed(3);
            bucket.push({ id, pct, pixels });
            if (bucket === drift) writeTriplet(options, id, diffPng);
        }
    }
    drift.sort((a, b) => b.pixels - a.pixels);
    allowedDrift.sort((a, b) => b.pixels - a.pixels);
    return { added, allowedDrift, compared, drift, removed };
}
