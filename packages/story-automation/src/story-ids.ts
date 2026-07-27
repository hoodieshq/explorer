import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface StoryIndexEntry {
    id: string;
    type?: string;
}

export interface StoryIndex {
    v?: number;
    entries: Record<string, StoryIndexEntry>;
}

/** Extracts capturable story ids from a Storybook index, dropping docs-only entries. */
export function storyIdsFromIndex(index: StoryIndex): string[] {
    return Object.values(index.entries)
        .filter(entry => (entry.type ?? 'story') === 'story')
        .map(entry => entry.id)
        .sort();
}

export function stripTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

export async function fetchStoryIds(baseUrl: string): Promise<string[]> {
    const url = `${stripTrailingSlash(baseUrl)}/index.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} responded ${res.status}`);
    const index: StoryIndex = await res.json();
    return storyIdsFromIndex(index);
}

export async function readStoryIds(staticDir: string): Promise<string[]> {
    const raw = await readFile(join(staticDir, 'index.json'), 'utf8');
    const index: StoryIndex = JSON.parse(raw);
    return storyIdsFromIndex(index);
}
