import type { CompiledInnerInstruction, VersionedMessage } from '@solana/web3.js';
import type { ReactNode } from 'react';

import { InstructionsSection } from '../../InstructionsSection';
import { useDecodedMessage } from '../../use-decoded-message';

export function InstructionsSectionFixture({
    message,
    compiledInnerInstructions,
}: {
    message: VersionedMessage;
    compiledInnerInstructions?: CompiledInnerInstruction[];
}): ReactNode {
    const decodedMessage = useDecodedMessage(message, compiledInnerInstructions);
    return <InstructionsSection message={message} decodedMessage={decodedMessage} />;
}
