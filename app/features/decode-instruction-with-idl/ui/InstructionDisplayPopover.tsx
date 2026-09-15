import { Button } from '@components/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import type { TransactionInstruction } from '@solana/web3.js';
import { useState } from 'react';
import { Info } from 'react-feather';

import { useInstructionDisplayFromRaw } from '../model/use-instruction-display-from-raw';
import { BaseInstructionDisplayPopoverBody } from './BaseInstructionDisplayPopoverBody';

/**
 * An info mark on an instruction card that opens the sRFC 39 clear-signing summary for that instruction.
 * The mark is absent unless the program's IDL publishes an intent, so its presence is itself the signal.
 */
export function InstructionDisplayPopover({
    onRequestRaw,
    programId,
    raw,
}: {
    raw: TransactionInstruction | undefined;
    programId: string;
    onRequestRaw?: () => void;
}) {
    const [open, setOpen] = useState(false);
    // Latched, not tied to `open`: the hook clears its display when disabled, so reopening would re-hit RPC.
    const [enabled, setEnabled] = useState(false);
    const { display, hasDisplay, isLoading } = useInstructionDisplayFromRaw({ enabled, programId, raw });

    if (!hasDisplay) return undefined;

    const handleOpenChange = (next: boolean) => {
        setOpen(next);

        if (!next || enabled) return;

        setEnabled(true);
        if (!raw) onRequestRaw?.();
    };

    // The hook idles while there are no bytes to read, so a raw fetch that can still be answered is its own wait.
    const isResolving = isLoading || (raw === undefined && onRequestRaw !== undefined);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    ui="dashkit"
                    size="sm"
                    variant="white"
                    className="flex items-center"
                    aria-label="Instruction summary"
                    data-testid="instruction-display-trigger"
                >
                    <Info size={13} />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-[min(28rem,calc(100vw-2rem))] p-3"
                data-testid="instruction-display-popover"
            >
                <BaseInstructionDisplayPopoverBody display={display} isResolving={isResolving} />
            </PopoverContent>
        </Popover>
    );
}
