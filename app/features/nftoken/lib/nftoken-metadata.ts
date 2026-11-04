import { is, nullable, optional, string, type, unknown } from 'superstruct';

type NftokenMetadata = {
    image: string | undefined;
    name: string | undefined;
    description?: string;
    /** The project's site, as written in the metadata: not checked to be a safe link. */
    externalUrl?: string;
    /** Undefined when the metadata has no trait list. */
    traits?: NftokenTrait[];
};

export type NftokenTrait = { type: string; value: string };

export type NftokenMetadataAnswer = { kind: 'loaded'; metadata: NftokenMetadata } | { kind: 'unavailable' };

const NftokenMetadataSchema = type({
    description: optional(unknown()),
    external_url: optional(unknown()),
    image: optional(nullable(string())),
    name: optional(nullable(string())),
    traits: optional(unknown()),
});

export function parseNftokenMetadata(json: unknown): NftokenMetadataAnswer {
    if (Array.isArray(json) || !is(json, NftokenMetadataSchema)) return { kind: 'unavailable' };

    return {
        kind: 'loaded',
        metadata: {
            description: optionalText(json.description),
            externalUrl: optionalText(json.external_url),
            image: json.image?.trim() || undefined,
            name: json.name?.trim() || undefined,
            traits: parseTraits(json.traits),
        },
    };
}

// The description, the site and the traits are read only when they have the expected shape. Unlike a bad name or image they don't make the
// whole metadata unavailable: the header had loaded such metadata before it showed these two.
function optionalText(value: unknown): string | undefined {
    return typeof value === 'string' ? value.trim() || undefined : undefined;
}

// The Metaplex attributes' rule: a trait needs a text type and a text or number value; others are skipped.
function parseTraits(value: unknown): NftokenTrait[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.flatMap(trait =>
        is(trait, TraitSchema) && (typeof trait.value === 'string' || typeof trait.value === 'number')
            ? [{ type: trait.trait_type, value: String(trait.value) }]
            : [],
    );
}

const TraitSchema = type({ trait_type: string(), value: unknown() });
