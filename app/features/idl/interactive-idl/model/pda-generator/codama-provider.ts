import { createProgramClient, type ProgramClient } from '@codama/dynamic-client';
import { getIdlSpecType, type SupportedIdl } from '@entities/idl';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { camelCase } from 'change-case';
import type {
    ConditionalValueNode,
    ConstantPdaSeedNode,
    InstructionAccountNode,
    InstructionNode,
    PdaNode,
    PdaValueNode,
    RootNode,
    TypeNode,
} from 'codama';
import {
    CODAMA_ERROR__VISITORS__CYCLIC_DEPENDENCY_DETECTED_WHEN_RESOLVING_INSTRUCTION_DEFAULT_VALUES,
    getResolvedInstructionInputsVisitor,
    isCodamaError,
    isNode,
    visit,
} from 'codama';

import { convertValue } from '../codama/convert-value';
import type { PdaGenerationResult, PdaProvider } from './types';

type FormArgs = Record<string, string | undefined>;
type FormAccounts = Record<string, string | Record<string, string | undefined> | undefined>;

/**
 * PDA provider for Codama IDL format.
 * Uses createProgramClient from @codama/dynamic-client for PDA derivation.
 */
export function createCodamaPdaProvider(): PdaProvider {
    let cachedClient: ProgramClient | undefined;
    let cachedClientKey: string | undefined;

    return {
        canHandle(idl: SupportedIdl): boolean {
            return getIdlSpecType(idl) === 'codama';
        },

        async computePdas(idl, instructionName, formArgs, formAccounts) {
            const root = idl as RootNode;
            const key = `${root.program.publicKey}:${root.version}`;
            let client: ProgramClient;
            if (cachedClient && cachedClientKey === key) {
                client = cachedClient;
            } else {
                client = createProgramClient(root, { programId: root.program.publicKey });
                cachedClient = client;
                cachedClientKey = key;
            }

            const ixNode = root.program.instructions.find(i => camelCase(i.name) === instructionName);
            if (!ixNode) return {};

            return deriveInstructionPdas(client, root, ixNode, formArgs, formAccounts);
        },

        getProgramId(idl: SupportedIdl): PublicKey | null {
            const root = idl as RootNode;
            try {
                return new PublicKey(root.program.publicKey);
            } catch {
                return null;
            }
        },

        name: 'codama',
    };
}

// ---------------------------------------------------------------------------
// PDA derivation using ProgramClient
// ---------------------------------------------------------------------------

async function deriveInstructionPdas(
    client: ProgramClient,
    root: RootNode,
    instruction: InstructionNode,
    formArgs: FormArgs,
    formAccounts: FormAccounts,
): Promise<Record<string, PdaGenerationResult>> {
    const pdaMap = new Map<string, PdaNode>(root.program.pdas.map(p => [p.name, p]));
    const results: Record<string, PdaGenerationResult> = {};
    const recursiveAccounts = findRecursivePdaAccounts(instruction);

    for (const acc of instruction.accounts) {
        const pdaInfo = getAccountPdaInfo(acc, pdaMap, formArgs, formAccounts);
        if (!pdaInfo) continue;

        const { pdaNode, seedMappings } = pdaInfo;
        const accountName = camelCase(acc.name);

        if (recursiveAccounts.has(accountName)) {
            results[accountName] = { generated: null, seeds: [] };
            continue;
        }

        const { seedInputs, seedInfo, allResolved } = buildSeedInputs(
            pdaNode,
            seedMappings,
            root,
            formArgs,
            formAccounts,
        );

        if (!allResolved) {
            results[accountName] = { generated: null, seeds: seedInfo };
            continue;
        }

        try {
            const pdaFn = client.pdas?.[pdaNode.name];
            if (!pdaFn) {
                results[accountName] = { generated: null, seeds: seedInfo };
                continue;
            }
            const [address] = await pdaFn(seedInputs);
            results[accountName] = { generated: String(address), seeds: seedInfo };
        } catch {
            results[accountName] = { generated: null, seeds: seedInfo };
        }
    }

    return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find PDA accounts involved in dependency cycles (A->A, A->B->A, A->B->C->A, etc.).
 * Auto-filling these would cause infinite update loops in the UI.
 *
 * Delegates to codama's getResolvedInstructionInputsVisitor which throws on cycles
 * We catch the error and extract the cyclic account names.
 */
function findRecursivePdaAccounts(instruction: InstructionNode): Set<string> {
    try {
        visit(instruction, getResolvedInstructionInputsVisitor());
        return new Set();
    } catch (e) {
        if (
            isCodamaError(
                e,
                CODAMA_ERROR__VISITORS__CYCLIC_DEPENDENCY_DETECTED_WHEN_RESOLVING_INSTRUCTION_DEFAULT_VALUES,
            )
        ) {
            const cycleNames = e.context.cycle.filter(n => n.kind === 'instructionAccountNode').map(n => n.name);
            return new Set(cycleNames);
        }
        return new Set();
    }
}

function getAccountPdaInfo(
    acc: InstructionAccountNode,
    pdaMap: Map<string, PdaNode>,
    formArgs: FormArgs,
    formAccounts: FormAccounts,
): { pdaNode: PdaNode; seedMappings: PdaValueNode['seeds'] } | null {
    const pdaValue = getPdaValueNode(acc, formArgs, formAccounts);
    if (!pdaValue) return null;

    const pdaNode = resolvePdaNode(pdaValue, pdaMap);
    if (!pdaNode) return null;

    return { pdaNode, seedMappings: pdaValue.seeds };
}

function getPdaValueNode(
    acc: InstructionAccountNode,
    formArgs: FormArgs,
    formAccounts: FormAccounts,
): PdaValueNode | undefined {
    if (!acc.defaultValue) return undefined;

    if (isNode(acc.defaultValue, 'pdaValueNode')) {
        return acc.defaultValue;
    }

    if (isNode(acc.defaultValue, 'conditionalValueNode')) {
        const { ifTrue, ifFalse } = acc.defaultValue;
        const ifTruePda = ifTrue && isNode(ifTrue, 'pdaValueNode') ? ifTrue : undefined;
        const ifFalsePda = ifFalse && isNode(ifFalse, 'pdaValueNode') ? ifFalse : undefined;

        const result = evaluateCondition(acc.defaultValue, formArgs, formAccounts);
        if (result === true) return ifTruePda;
        if (result === false) return ifFalsePda;

        // Condition couldn't be evaluated — best-effort fallback, preferring ifTrue.
        return ifTruePda ?? ifFalsePda;
    }

    return undefined;
}

function evaluateCondition(node: ConditionalValueNode, formArgs: FormArgs, formAccounts: FormAccounts): boolean | null {
    const raw = readFormValue(node.condition, formArgs, formAccounts);
    if (raw === null) return null;

    // No expected value to check against. Check value presence to determine truthiness.
    if (!node.value) {
        return raw.trim() !== '';
    }

    // Resolved form value must match the expected value.
    const expected = expectedConditionValueAsString(node.value);
    if (expected === null) return null;
    return raw.trim() === expected;
}

function readFormValue(
    condition: ConditionalValueNode['condition'],
    formArgs: FormArgs,
    formAccounts: FormAccounts,
): string | null {
    if (isNode(condition, 'accountValueNode')) {
        const raw = formAccounts[condition.name];
        return typeof raw === 'string' ? raw : '';
    }
    if (isNode(condition, 'argumentValueNode')) {
        return formArgs[condition.name] ?? '';
    }
    return null;
}

/**
 * Extract a comparable string form of a codama value node.
 * Returns null for ValueNode kinds that are not primitive scalars.
 */
function expectedConditionValueAsString(valueNode: NonNullable<ConditionalValueNode['value']>): string | null {
    if (isNode(valueNode, 'numberValueNode')) return String(valueNode.number);
    if (isNode(valueNode, 'stringValueNode')) return valueNode.string;
    if (isNode(valueNode, 'booleanValueNode')) return String(valueNode.boolean);
    if (isNode(valueNode, 'publicKeyValueNode')) return valueNode.publicKey;
    return null;
}

function resolvePdaNode(pdaValue: PdaValueNode, pdaMap: Map<string, PdaNode>): PdaNode | undefined {
    if (isNode(pdaValue.pda, 'pdaNode')) return pdaValue.pda;
    if (isNode(pdaValue.pda, 'pdaLinkNode')) return pdaMap.get(pdaValue.pda.name);
    return undefined;
}

interface SeedInputResult {
    seedInputs: Record<string, unknown>;
    seedInfo: PdaGenerationResult['seeds'];
    allResolved: boolean;
}

function buildSeedInputs(
    pdaNode: PdaNode,
    seedMappings: PdaValueNode['seeds'],
    root: RootNode,
    formArgs: FormArgs,
    formAccounts: FormAccounts,
): SeedInputResult {
    const seedInputs: Record<string, unknown> = {};
    const seedInfo: PdaGenerationResult['seeds'] = [];
    let allResolved = true;

    for (const seed of pdaNode.seeds) {
        if (seed.kind === 'constantPdaSeedNode') {
            // Constant seeds are handled by the library automatically.
            // Just add display info.
            const hex = constantSeedToHex(seed, root);
            seedInfo.push({ name: `0x${hex}`, value: `0x${hex}` });
            continue;
        }

        // Variable seed — find the mapping to determine the form value source
        const mapping = seedMappings.find(m => m.name === seed.name);
        let formValue: string | null = null;

        if (mapping) {
            if (mapping.value.kind === 'accountValueNode') {
                const raw = formAccounts[camelCase(mapping.value.name)];
                formValue = typeof raw === 'string' && raw.trim() !== '' ? raw : null;
            } else if (mapping.value.kind === 'argumentValueNode') {
                const raw = formArgs[camelCase(mapping.value.name)];
                formValue = raw !== undefined && raw !== '' ? raw : null;
            }
        }

        const seedName = camelCase(seed.name);
        seedInfo.push({ name: seedName, value: formValue });

        if (formValue === null) {
            allResolved = false;
            continue;
        }

        try {
            seedInputs[seed.name] = convertValue(formValue, seed.type as TypeNode);
        } catch {
            allResolved = false;
        }
    }

    return { allResolved, seedInfo, seedInputs };
}

/**
 * Convert a constant PDA seed node to a hex string for display.
 */
function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function constantSeedToHex(seed: ConstantPdaSeedNode, root: RootNode): string {
    const { value } = seed;

    if (isNode(value, 'stringValueNode')) {
        return toHex(new TextEncoder().encode(value.string));
    }
    if (isNode(value, 'bytesValueNode')) {
        return decodeBytesValueToHex(value.data, value.encoding);
    }
    if (isNode(value, 'publicKeyValueNode')) {
        return toHex(new PublicKey(value.publicKey).toBytes());
    }
    if (isNode(value, 'programIdValueNode')) {
        return toHex(new PublicKey(root.program.publicKey).toBytes());
    }

    return '';
}

function decodeBytesValueToHex(data: string, encoding: string): string {
    switch (encoding) {
        case 'base16':
            return data;
        case 'base58':
            return toHex(Uint8Array.from(bs58.decode(data)));
        case 'base64':
            return toHex(Uint8Array.from(atob(data), c => c.charCodeAt(0)));
        case 'utf8':
            return toHex(new TextEncoder().encode(data));
        default:
            return '';
    }
}
