#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { captureStories } from './capture.js';
import { diffDirectories, loadAllowlists } from './diff.js';
import { serveStatic } from './serve.js';
import { fetchStoryIds, readStoryIds, stripTrailingSlash } from './story-ids.js';
import { type BaselineMeta, summaryMarkdown, summaryText } from './summary.js';

const USAGE = `Usage:
  story-automation story-ids (--static-dir <dir> | --url <url>)
  story-automation capture (--static-dir <dir> | --url <url>) --out <dir> [--ids <file>] [--parallel <n>]
  story-automation diff --baseline <dir> --current <dir> [--triplets <dir>] [--allowlist <file>]... [--include-flaky] [--summary-md] [--merge-base <sha>]
  story-automation chromium-revision
`;

function fail(message: string): never {
    process.stderr.write(`${message}\n\n${USAGE}`);
    process.exit(2);
}

async function resolveSource(values: {
    'static-dir'?: string;
    url?: string;
}): Promise<{ url: string; close: () => Promise<void> }> {
    if (values['static-dir'] && values.url) fail('--static-dir and --url are mutually exclusive');
    if (values.url) return { close: async () => {}, url: stripTrailingSlash(values.url) };
    if (values['static-dir']) return serveStatic(resolve(values['static-dir']));
    fail('one of --static-dir or --url is required');
}

async function runStoryIds(args: string[]): Promise<void> {
    const { values } = parseArgs({ args, options: { 'static-dir': { type: 'string' }, url: { type: 'string' } } });
    if (values['static-dir'] && values.url) fail('--static-dir and --url are mutually exclusive');
    if (values['static-dir']) {
        process.stdout.write(`${JSON.stringify(await readStoryIds(resolve(values['static-dir'])), undefined, 2)}\n`);
    } else if (values.url) {
        process.stdout.write(`${JSON.stringify(await fetchStoryIds(values.url), undefined, 2)}\n`);
    } else {
        fail('one of --static-dir or --url is required');
    }
}

async function runCapture(args: string[]): Promise<void> {
    const { values } = parseArgs({
        args,
        options: {
            ids: { type: 'string' },
            out: { type: 'string' },
            parallel: { default: '6', type: 'string' },
            'static-dir': { type: 'string' },
            url: { type: 'string' },
        },
    });
    if (!values.out) fail('--out is required');
    const parallel = Number(values.parallel);
    if (!Number.isInteger(parallel) || parallel < 1) fail('--parallel must be a positive integer');

    const source = await resolveSource(values);
    try {
        const ids: string[] = values.ids
            ? JSON.parse(readFileSync(resolve(values.ids), 'utf8'))
            : await fetchStoryIds(source.url);
        process.stderr.write(`[capture] ${ids.length} stories @ 2x DPR, ${parallel} pages → ${values.out}\n`);
        const result = await captureStories({
            baseUrl: source.url,
            ids,
            log: line => process.stderr.write(`[capture] ${line}\n`),
            outDir: resolve(values.out),
            parallel,
        });
        process.stderr.write(`[capture] done: ${result.captured} captured, ${result.failed.length} failed\n`);
        // >10% failures means the build is broken wholesale, not flaky — an "everything removed" diff must not pass as green
        if (result.failed.length > ids.length * 0.1) {
            process.stderr.write(`[capture] failure rate above 10% — treating the run as broken\n`);
            process.exitCode = 1;
        }
    } finally {
        await source.close();
    }
}

async function runDiff(args: string[]): Promise<void> {
    const { values } = parseArgs({
        args,
        options: {
            allowlist: { multiple: true, type: 'string' },
            baseline: { type: 'string' },
            current: { type: 'string' },
            'include-flaky': { default: false, type: 'boolean' },
            'merge-base': { type: 'string' },
            'summary-md': { default: false, type: 'boolean' },
            triplets: { type: 'string' },
        },
    });
    if (!values.baseline || !values.current) fail('--baseline and --current are required');

    const allowlist = values['include-flaky'] ? new Set<string>() : loadAllowlists(values.allowlist ?? []);
    const baselineDir = resolve(values.baseline);
    const result = diffDirectories({
        allowlist,
        baselineDir,
        currentDir: resolve(values.current),
        tripletDir: values.triplets ? resolve(values.triplets) : undefined,
    });

    const metaPath = join(baselineDir, 'baseline-meta.json');
    const meta: BaselineMeta | undefined = existsSync(metaPath)
        ? JSON.parse(readFileSync(metaPath, 'utf8'))
        : undefined;
    const text = summaryText(result);
    if (values['summary-md']) {
        process.stdout.write(summaryMarkdown(result, { mergeBase: values['merge-base'], meta }));
        process.stderr.write(text);
    } else {
        process.stdout.write(text);
    }
    if (result.drift.length > 0) process.exitCode = 1;
}

/** The chromium build, not the playwright package version, is what determines rendered pixels (cache key input). */
function runChromiumRevision(): void {
    const requireHere = createRequire(import.meta.url);
    const requireFromPlaywright = createRequire(requireHere.resolve('playwright/package.json'));
    // browsers.json is not in playwright-core's exports map — locate the package root via its main entry
    const coreRoot = dirname(requireFromPlaywright.resolve('playwright-core'));
    const manifest: { browsers: { name: string; revision: string }[] } = JSON.parse(
        readFileSync(join(coreRoot, 'browsers.json'), 'utf8'),
    );
    const { browsers } = manifest;
    const chromium = browsers.find(browser => browser.name === 'chromium');
    if (!chromium) throw new Error('chromium entry missing from playwright-core/browsers.json');
    process.stdout.write(`${chromium.revision}\n`);
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
    case 'story-ids':
        await runStoryIds(rest);
        break;
    case 'capture':
        await runCapture(rest);
        break;
    case 'diff':
        await runDiff(rest);
        break;
    case 'chromium-revision':
        runChromiumRevision();
        break;
    default:
        fail(command ? `unknown command: ${command}` : 'missing command');
}
