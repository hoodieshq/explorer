/* Fonts for the generated OG images.
 *
 * `ImageResponse` (satori) ships no font of its own that we want: given none, it
 * renders everything in its bundled Noto Sans, so the share image was the one
 * product surface that used neither Rubik nor Roboto Mono. next/font cannot help
 * here — it produces CSS for a browser, while satori needs the bytes.
 *
 * The files are the latin-only TTFs the receipt PDF embeds (public/fonts/*.ttf,
 * ~210 KB for all six), read through `import.meta.url` so the bundler packs them
 * into the function instead of the image generator fetching a stylesheet on
 * every cold start. They are Google's own files — the Medium pair is its
 * variable font instanced at wght=500 — so this is the type the designs are
 * drawn in and the gallery displays, without the network in the way of an image
 * we generate anyway.
 *
 * Weights: 400, 500 and 600, each with its own file, all three registered.
 * Registering 500 is not optional — CSS weight matching resolves an absent 500
 * *down* to 400, so a missing Medium does not fall forward to SemiBold, it
 * silently renders regular. And 500 must not be *given* the SemiBold file, which
 * is what it used to get: that draws the loud half of every row a step heavier
 * than it was drawn in the design.
 *
 * Order matters: satori takes the FIRST family as the default for anything that
 * does not name a `fontFamily`, so Rubik has to lead — the mono face is opted
 * into per element (addresses, amounts).
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

export function loadOgFonts(): Promise<OgFont[]> {
    if (!cached) {
        cached = (async () => {
            const faces = FAMILIES.flatMap(family =>
                WEIGHTS.map(({ file, weight }) => ({
                    name: family.name,
                    url: new URL(`../../../../public/fonts/${family.file}-${file}.ttf`, import.meta.url),
                    weight,
                })),
            );
            const data = await Promise.all(faces.map(face => read(face.url)));
            return faces.map((face, index) => ({
                data: data[index],
                name: face.name,
                style: 'normal',
                weight: face.weight,
            })) satisfies OgFont[];
        })().catch(error => {
            // Drop the rejected promise so one bad read does not leave every later
            // image unstyled for the life of the instance — the next call retries.
            cached = undefined;
            throw error;
        });
    }
    return cached;
}

async function read(url: URL): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load font ${url.pathname}: ${res.status}`);
    return res.arrayBuffer();
}
