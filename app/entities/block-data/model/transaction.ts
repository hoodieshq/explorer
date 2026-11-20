import type { CompiledTransactionMessage } from '@solana/kit';

export function getBlockTransactionInstructions(message: CompiledTransactionMessage) {
    if (message.version === 1) {
        return message.instructionHeaders.map((header, index) => {
            const payload = message.instructionPayloads[index];
            return {
                accountIndices: payload.instructionAccountIndices,
                data: new Uint8Array(payload.instructionData),
                programAddressIndex: header.programAccountIndex,
            };
        });
    }

    return message.instructions.map(instruction => ({
        accountIndices: instruction.accountIndices ?? [],
        data: new Uint8Array(instruction.data ?? []),
        programAddressIndex: instruction.programAddressIndex,
    }));
}
