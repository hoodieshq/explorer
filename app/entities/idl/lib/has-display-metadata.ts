/** Loose view of the few nodes the predicate reads, because an IDL arrives as unvalidated on-chain JSON. */
type MaybeRootNode = {
    kind?: unknown;
    program?: { instructions?: unknown };
};

/**
 * True when a Codama IDL publishes an sRFC 39 interpolated intent for at least one instruction.
 * Structural rather than a type guard: it narrows nothing, it only reports whether the display
 * affordance is worth offering. Malformed input is false, never a throw.
 */
export function hasDisplayMetadata(idl: unknown): boolean {
    const root = idl as MaybeRootNode | undefined;
    if (root?.kind !== 'rootNode') return false;

    const instructions = root.program?.instructions;
    if (!Array.isArray(instructions)) return false;

    return instructions.some(hasInterpolatedIntent);
}

function hasInterpolatedIntent(instruction: unknown): boolean {
    const intent = (instruction as { display?: { interpolatedIntent?: unknown } } | undefined)?.display
        ?.interpolatedIntent;

    return typeof intent === 'string' && intent.length > 0;
}
