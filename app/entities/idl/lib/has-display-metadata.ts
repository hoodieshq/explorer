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

    return instructions.some(instruction => getInterpolatedIntent(instruction) !== undefined);
}

/**
 * The raw sRFC 39 template of one instruction (`Transfer ${data.amount} to ${accounts.destination}`), for
 * renderers that need the sentence shape before every value exists. Undefined when the IDL carries none.
 */
export function getInstructionIntentTemplate(idl: unknown, instructionName: string): string | undefined {
    const root = idl as MaybeRootNode | undefined;
    if (root?.kind !== 'rootNode') return undefined;

    const instructions = root.program?.instructions;
    if (!Array.isArray(instructions)) return undefined;

    const instruction = instructions.find(
        candidate => (candidate as { name?: unknown } | undefined)?.name === instructionName,
    );
    return getInterpolatedIntent(instruction);
}

function getInterpolatedIntent(instruction: unknown): string | undefined {
    const intent = (instruction as { display?: { interpolatedIntent?: unknown } } | undefined)?.display
        ?.interpolatedIntent;

    return typeof intent === 'string' && intent.length > 0 ? intent : undefined;
}
