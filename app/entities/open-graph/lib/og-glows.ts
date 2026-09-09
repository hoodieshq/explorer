import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { toBase64 } from '@/app/shared/lib/bytes';

import type { OgGlows } from '../types';

/* The glow behind a share image, one per transaction status.
 *
 * A raster rather than a CSS `radial-gradient`, because the designer's asset carries a grey noise layer at
 * about 7 percent opacity on top of the blob. That noise is not decoration: it dithers away the banding
 * rings an 8-bit gradient of this size shows when resvg rasterizes it.
 *
 * PNG rather than the WebP the design ships, because satori cannot decode WebP - it fails with
 * `u2 is not iterable`. The two files are pixel-identical to the WebP originals.
 *
 * Handed on as data URIs because satori resolves no relative URL. Read off disk rather than inlined as
 * base64 in source: the two together are 1 MB of base64 in the module graph, against a read and encode that
 * happens once per instance in front of a render that costs far more.
 */

const FILES = {
    failed: 'pink_gradient',
    success: 'green_gradient',
} as const;

let cached: Promise<OgGlows> | undefined;

/**
 * Both glows as base64 PNG data URIs, read once per instance.
 */
export function loadOgGlows(): Promise<OgGlows> {
    if (!cached) {
        cached = (async () => {
            const [failed, success] = await Promise.all([read(FILES.failed), read(FILES.success)]);

            return { failed, success };
        })().catch(error => {
            // Drop the rejected promise so one bad read does not leave every later image without its glow
            // for the life of the instance - the next call retries.
            cached = undefined;
            throw error;
        });
    }

    return cached;
}

async function read(file: string): Promise<string> {
    const bytes = await readFile(join(process.cwd(), 'public', 'img', 'og', `${file}.png`));

    return `data:image/png;base64,${toBase64(new Uint8Array(bytes))}`;
}
