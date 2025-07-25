import { Accordion } from '@components/shared/ui/accordion';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';

import type { InstructionData } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';

import { originalIdlAtom } from '../model/original-idl';
import { programIdAtom } from '../model/program-id';
import { BaseIdl } from '../model/unified-program.d';
import { useInstruction } from '../model/use-instruction';
import { type InstructionCallParams, InteractInstruction } from './InteractInstruction';

export function InteractInstructions({
    selectedInstruction,
    instructions,
}: {
    instructions: InstructionData[];
    selectedInstruction: Pick<InstructionData, 'name'>;
}) {
    const idl = useAtomValue(originalIdlAtom);
    const programId = useAtomValue(programIdAtom);

    let enabled = false;
    let params: { idl: BaseIdl; programId: PublicKey } | undefined = undefined;
    if (idl && programId) {
        params = { idl, programId };
        enabled = true;
    }

    const { isInitialized, program, isProgramLoading, instructionState, invokeInstruction } = useInstruction({
        enabled,
        idl: params?.idl,
        programId: params?.programId.toString(),
    });

    const handleExecuteInstruction = useCallback(
        async (name: InstructionData['name'], data: InstructionData, params: InstructionCallParams) => {
            console.log(name, data, params);

            await invokeInstruction(name, data, params);
        },
        [invokeInstruction]
    );

    console.log({ instructionState, isInitialized, isProgramLoading });

    return (
        <>
            <div className="e-mb-4">
                <h2 className="e-text-2xl e-font-bold e-text-white">Program Instructions</h2>
                <p className="e-mt-1 e-text-sm e-text-[#8E9090]">Program ID: {programId}</p>
            </div>

            <Accordion type="single" value={selectedInstruction} collapsible className="e-space-y-4">
                {instructions.map(instruction => (
                    <InteractInstruction
                        key={instruction.name}
                        instruction={instruction}
                        onExecuteInstruciton={handleExecuteInstruction}
                    />
                ))}
            </Accordion>
        </>
    );
}
