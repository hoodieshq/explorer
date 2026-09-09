import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/* Fonts for the generated Open Graph images. */

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

// Rubik first: the array's order is what makes it default family.
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
        cached = readEveryFont().catch(error => {
            cached = undefined;
            throw error;
        });
    }

    return cached;
}

/**
 * Every font the two families declare, read off disk in one parallel pass.
 */
async function readEveryFont(): Promise<OgFont[]> {
    const fonts = FAMILIES.flatMap(family =>
        WEIGHTS.map(({ file, weight }) => ({
            name: family.name,
            path: join(process.cwd(), 'public', 'fonts', `${family.file}-${file}.ttf`),
            weight,
        })),
    );
    const data = await Promise.all(fonts.map(font => readFont(font.path)));

    return fonts.map((font, index) => ({
        data: data[index],
        name: font.name,
        style: 'normal',
        weight: font.weight,
    }));
}

async function readFont(path: string): Promise<ArrayBuffer> {
    const bytes = await readFile(path);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
