import type { DiffResult, DriftEntry } from './diff.js';

export interface BaselineMeta {
    sha?: string;
    imageOS?: string;
    imageVersion?: string;
    playwright?: string;
    chromiumRevision?: string;
    capturedAt?: string;
}

export interface SummaryContext {
    meta?: BaselineMeta;
    mergeBase?: string;
}

const MAX_LISTED = 50;

function driftRow(entry: DriftEntry): string {
    const pixels = entry.reason === 'dim-mismatch' ? 'dim-mismatch' : String(entry.pixels);
    const pct = entry.reason === 'dim-mismatch' ? '—' : `${entry.pct}%`;
    return `| \`${entry.id}\` | ${pixels} | ${pct} |`;
}

function idList(title: string, ids: string[]): string[] {
    if (ids.length === 0) return [];
    const shown = ids.slice(0, MAX_LISTED);
    const more = ids.length > shown.length ? `\n… and ${ids.length - shown.length} more` : '';
    return [
        '',
        `<details><summary>${title} (${ids.length})</summary>`,
        '',
        ...shown.map(id => `- \`${id}\``),
        more,
        '</details>',
    ];
}

export function summaryMarkdown(result: DiffResult, context: SummaryContext = {}): string {
    const lines: string[] = ['### Storybook visual regression', ''];
    const { meta, mergeBase } = context;
    if (meta?.sha) {
        const captured = meta.capturedAt ? `, captured ${meta.capturedAt}` : '';
        lines.push(`Baseline: \`${meta.sha.slice(0, 9)}\`${captured}`);
        if (mergeBase && !mergeBase.startsWith(meta.sha) && !meta.sha.startsWith(mergeBase)) {
            lines.push(
                `> ⚠️ approximate baseline: PR merge-base is \`${mergeBase.slice(0, 9)}\`, not the baseline commit`,
            );
        }
        lines.push('');
    }
    lines.push(
        `Compared **${result.compared}** stories — drift **${result.drift.length}**, allowlisted drift ${result.allowedDrift.length}, new ${result.added.length}, removed ${result.removed.length}`,
    );
    if (result.drift.length > 0) {
        lines.push(
            '',
            '| story | pixels | % |',
            '| --- | ---: | ---: |',
            ...result.drift.slice(0, MAX_LISTED).map(driftRow),
        );
        if (result.drift.length > MAX_LISTED)
            lines.push(`\n… and ${result.drift.length - MAX_LISTED} more drifted stories`);
    }
    lines.push(
        ...idList(
            'Allowlisted drift',
            result.allowedDrift.map(entry => entry.id),
        ),
    );
    lines.push(...idList('New stories (no baseline)', result.added));
    lines.push(...idList('Removed stories (baseline only)', result.removed));
    return `${lines.join('\n')}\n`;
}

export function summaryText(result: DiffResult): string {
    const lines = [
        `compared: ${result.compared}`,
        `drift (outside allowlists): ${result.drift.length}`,
        `drift inside allowlists: ${result.allowedDrift.length}`,
        `new: ${result.added.length}, removed: ${result.removed.length}`,
    ];
    if (result.drift.length > 0) {
        lines.push('', 'story                                                          pixels        %');
        for (const entry of result.drift) {
            const pixels = entry.reason === 'dim-mismatch' ? 'dim' : String(entry.pixels);
            lines.push(`  ${entry.id.padEnd(60)} ${pixels.padStart(8)}   ${String(entry.pct).padStart(7)}`);
        }
    }
    return `${lines.join('\n')}\n`;
}
