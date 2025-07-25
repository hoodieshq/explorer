import { PublicKey } from '@solana/web3.js';

import { UnifiedAccounts, UnifiedArguments } from './unified-program.d';

export function useInstructionInteract() {
    return {};
}

export function populateAccounts(accounts: Record<string, object>, instructionName: string) {
    return Object.keys(accounts).reduce((acc, k) => {
        const { field, value } = populateValues(accounts, k, instructionName);

        if (value instanceof PublicKey) {
            acc[field] = value;
        } else if (typeof value === 'string') {
            acc[field] = new PublicKey(value);
        }
        return acc;
    }, {} as UnifiedAccounts);
}

export function populateArguments(args: Record<string, object>, instructionName: string) {
    return Object.keys(args).reduce((acc, k) => {
        const { value } = populateValues(args, k, instructionName);

        acc.push(value);
        return acc;
    }, [] as UnifiedArguments);
}

function populateValues(data: Record<string, unknown>, key: string, instructionName: string) {
    const [name, field] = key.split('.');
    if (name !== instructionName) throw new Error(`Could not populate data for ${instructionName}`);

    return { field, value: data[key] };
}
