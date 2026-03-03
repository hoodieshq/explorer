import type { InstructionData, SupportedIdl } from '@entities/idl';
import { PublicKey } from '@solana/web3.js';
import { camelCase } from 'change-case';
import type { DeepPartial } from 'react-hook-form';

import type { InstructionFormData } from '../use-instruction-form';
import { createAnchorPdaProvider } from './anchor-provider';
import { createCodamaPdaProvider } from './codama-provider';
import { resolveProgramId } from './program-resolver';
import { createPdaProviderRegistry } from './registry';
import { buildSeedsWithInfo } from './seed-builder';
import type { PdaGenerationResult } from './types';

const defaultRegistry = createPdaProviderRegistry();
defaultRegistry.register(createAnchorPdaProvider());
defaultRegistry.register(createCodamaPdaProvider());

/**
 * Computes PDA addresses for accounts that have PDA seeds defined.
 * Returns a map of account names (camelCase) to their computed PDA data.
 *
 * If the provider supports direct `computePdas`, delegates to it (async).
 * Otherwise falls back to the synchronous findInstruction + seed-builder path.
 */
export async function computePdas(
    idl: SupportedIdl | undefined,
    instruction: InstructionData,
    formValues: DeepPartial<InstructionFormData>,
): Promise<Record<string, PdaGenerationResult>> {
    if (!idl || !instruction) {
        return {};
    }

    const provider = defaultRegistry.findProvider(idl);
    if (!provider) {
        return {};
    }

    const programId = provider.getProgramId(idl);
    if (!programId) {
        return {};
    }

    const args = formValues.arguments?.[instruction.name] || {};
    const accounts = formValues.accounts?.[instruction.name] || {};

    // Use provider's direct PDA computation if available
    if (provider.computePdas) {
        return provider.computePdas(
            idl,
            instruction.name,
            args as Record<string, string | undefined>,
            accounts as Record<string, string | Record<string, string | undefined> | undefined>
        );
    }

    // Fallback: sync path using findInstruction + seed-builder
    return computePdasSync(idl, instruction, provider, programId, args, accounts);
}

function computePdasSync(
    idl: SupportedIdl,
    instruction: InstructionData,
    provider: ReturnType<typeof defaultRegistry.findProvider> & object,
    programId: PublicKey,
    args: Record<string, unknown>,
    accounts: Record<string, unknown>
): Record<string, PdaGenerationResult> {
    const idlInstruction = provider.findInstruction(idl, instruction.name);
    if (!idlInstruction) {
        return {};
    }

    const pdaAddresses: Record<string, PdaGenerationResult> = {};

    for (const account of idlInstruction.accounts) {
        if (!account.pda) {
            continue;
        }

        // Skip if pda is just a boolean (0.29 IDL) without seeds definition
        if (typeof account.pda === 'boolean' || !account.pda.seeds) {
            continue;
        }

        const camelName = camelCase(account.name);

        try {
            const { buffers: seedBuffers, info: seedInfo } = buildSeedsWithInfo(
                account.pda.seeds,
                args as Record<string, string | undefined>,
                accounts as Record<string, string | Record<string, string | undefined> | undefined>,
                idlInstruction,
            );

            const derivationProgramId = resolveProgramId(programId, account.pda.program, {
                accounts: accounts as Record<string, string | Record<string, string | undefined> | undefined>,
                args: args as Record<string, string | undefined>,
            });

            if (seedBuffers && derivationProgramId) {
                const [pda] = PublicKey.findProgramAddressSync(seedBuffers, derivationProgramId);
                pdaAddresses[camelName] = {
                    generated: pda.toBase58(),
                    seeds: seedInfo,
                };
            } else {
                pdaAddresses[camelName] = {
                    generated: null,
                    seeds: seedInfo,
                };
            }
        } catch {
            const { info: seedInfo } = buildSeedsWithInfo(
                account.pda.seeds,
                args as Record<string, string | undefined>,
                accounts as Record<string, string | Record<string, string | undefined> | undefined>,
                idlInstruction
            );
            pdaAddresses[camelName] = {
                generated: null,
                seeds: seedInfo,
            };
        }
    }

    return pdaAddresses;
}
