import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/* Fonts for the generated Open Graph images.
 *
 * Satori ships no face we want: given none, `ImageResponse` renders everything in its bundled Noto Sans, so a
 * share image is the one product surface in neither Rubik nor Roboto Mono. next/font cannot help - it emits CSS
 * for a browser, while satori needs the bytes.
 *
 * Read off disk at runtime, once per instance, from the latin-only TTFs in public/fonts. Not through
 * `new URL(..., import.meta.url)`, which every bundler rewrites to something different: vite turns it into an
 * `http://localhost` asset URL, so the same expression means one thing under vitest and another after `next
 * build`. `process.cwd()` is the app root in both. What puts the files beside the function on a deploy is the
 * `outputFileTracingIncludes` entry in next.config.mjs, which names them explicitly.
 *
 * Weight 500 is registered from its own Medium file, not aliased to SemiBold: CSS weight matching resolves an
 * absent 500 *down* to 400, so a missing Medium renders regular rather than falling forward.
 *
 * Order matters: satori takes the FIRST family as the default for anything that does not name a `fontFamily`,
 * so Rubik leads and the mono face is opted into per element (signature, addresses).
 */

type OgFont = {
    data: ArrayBuffer;
    name: string;
    style: 'normal';
    weight: 400 | 500 | 600;
};

const WEIGHTS = [
    { file: 'Regular', weight: 400 },
    { file: 'Medium', weight: 500 },
    { file: 'SemiBold', weight: 600 },
] as const;

// Rubik first: the array's order is what makes it satori's default family.
const FAMILIES = [
    { file: 'Rubik', name: 'Rubik' },
    { file: 'RobotoMono', name: 'Roboto Mono' },
] as const;

let cached: Promise<OgFont[]> | undefined;

/**
 * Every face an OG image can ask for, loaded once per instance.
 */
export function loadOgFonts(): Promise<OgFont[]> {
    if (!cached) {
        cached = (async () => {
            const faces = FAMILIES.flatMap(family =>
                WEIGHTS.map(({ file, weight }) => ({
                    name: family.name,
                    path: join(process.cwd(), 'public', 'fonts', `${family.file}-${file}.ttf`),
                    weight,
                })),
            );
            const data = await Promise.all(faces.map(face => read(face.path)));

            return faces.map((face, index) => ({
                data: data[index],
                name: face.name,
                style: 'normal',
                weight: face.weight,
            })) satisfies OgFont[];
        })().catch(error => {
            // Drop the rejected promise so one bad read does not leave every later image unstyled for the life
            // of the instance - the next call retries.
            cached = undefined;
            throw error;
        });
    }

    return cached;
}

async function read(path: string): Promise<ArrayBuffer> {
    const bytes = await readFile(path);

    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
