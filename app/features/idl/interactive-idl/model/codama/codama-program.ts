import type { ProgramClient } from '@codama/dynamic-client';
import {
    getInstructionDisplay,
    type GetInstructionDisplayOptions,
    type InstructionDisplay,
} from '@codama/dynamic-instructions';
import { AccountRole, type Instruction } from '@solana/kit';
import type { TransactionInstruction } from '@solana/web3.js';
import { PublicKey, TransactionInstruction as TransactionInstructionClass } from '@solana/web3.js';

import { toBuffer } from '@/app/shared/lib/bytes';

import type { BaseIdl, UnifiedAccounts, UnifiedArguments, UnifiedProgram } from '../unified-program.d';
import { convertValue, getUserFacingArguments } from './convert-value';

function isSigner(role: AccountRole): boolean {
    return role === AccountRole.WRITABLE_SIGNER || role === AccountRole.READONLY_SIGNER;
}

function isWritable(role: AccountRole): boolean {
    return role === AccountRole.WRITABLE_SIGNER || role === AccountRole.WRITABLE;
}

/**
 * Convert a kit-style Instruction to a local TransactionInstruction.
 *
 * Creates TransactionInstruction instances using the explorer's own classes
 * so that `instanceof` checks in the execution layer work as expected.
 */
function toLocalTransactionInstruction(instruction: Instruction): TransactionInstruction {
    return new TransactionInstructionClass({
        data: instruction.data ? toBuffer(new Uint8Array(instruction.data)) : undefined,
        keys: (instruction.accounts ?? []).map(account => ({
            isSigner: isSigner(account.role),
            isWritable: isWritable(account.role),
            pubkey: new PublicKey(account.address),
        })),
        programId: new PublicKey(instruction.programAddress),
    });
}

/**
 * Unified program implementation for Codama IDLs.
 * Wraps a ProgramClient from @codama/dynamic-client.
 */
export class CodamaUnifiedProgram implements UnifiedProgram {
    constructor(
        public programId: PublicKey,
        public idl: BaseIdl,
        private client: ProgramClient,
    ) {}

    getClient(): ProgramClient {
        return this.client;
    }

    async buildInstruction(
        instructionName: string,
        accounts: UnifiedAccounts,
        args: UnifiedArguments,
    ): Promise<TransactionInstruction> {
        return toLocalTransactionInstruction(await this.buildKitInstruction(instructionName, accounts, args));
    }

    /**
     * Resolve the sRFC 39 display for an instruction: an intent label, an interpolated sentence and a
     * labelled field list. Undefined when the built instruction cannot be identified against the IDL.
     * An IDL without `display` metadata still yields a titleCased intent and raw fields.
     */
    async getInstructionDisplay(
        instructionName: string,
        accounts: UnifiedAccounts,
        args: UnifiedArguments,
        options?: GetInstructionDisplayOptions,
    ): Promise<InstructionDisplay | undefined> {
        const instruction = await this.buildKitInstruction(instructionName, accounts, args);

        // `accounts` and `data` are optional on a Kit instruction but required for identification:
        // the discriminator is read from the data, and named accounts are matched by index.
        const display = await getInstructionDisplay(
            this.client.root,
            {
                accounts: instruction.accounts ?? [],
                data: instruction.data ?? new Uint8Array(),
                programAddress: instruction.programAddress,
            },
            options,
        );

        return display ?? undefined;
    }

    private async buildKitInstruction(
        instructionName: string,
        accounts: UnifiedAccounts,
        args: UnifiedArguments,
    ): Promise<Instruction> {
        const { root } = this.client;

        // Look up instruction node for type information
        const instructionNode = this.client.instructions.get(instructionName);
        if (!instructionNode) {
            throw new Error(
                `Instruction "${instructionName}" not found. Available: ${[...this.client.instructions.keys()].join(
                    ', ',
                )}`,
            );
        }

        // Convert positional args → named args using instruction argument definitions
        const userArgs = getUserFacingArguments(instructionNode);
        const namedArgs: Record<string, unknown> = {};

        for (let i = 0; i < userArgs.length; i++) {
            const argDef = userArgs[i];
            const rawValue = args[i];

            try {
                namedArgs[argDef.name] = convertValue(rawValue, argDef.type, root);
            } catch (e) {
                throw new Error(`Could not convert "${argDef.name}" argument for "${instructionName}"`, { cause: e });
            }
        }

        // Convert UnifiedAccounts (Record<string, PublicKey | null>) to string addresses
        const accountsInput: Record<string, string | null> = {};
        for (const [key, value] of Object.entries(accounts)) {
            accountsInput[key] = value ? value.toBase58() : null;
        }

        const methodFn = this.client.methods[instructionName];
        if (!methodFn) {
            throw new Error(`Method "${instructionName}" not found on program client`);
        }

        return methodFn(namedArgs).accounts(accountsInput).instruction();
    }
}
