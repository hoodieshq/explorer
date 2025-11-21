import { LoadingCard } from '@components/shared/LoadingCard';
import { ExplorerLink } from '@entities/cluster/ui/ExplorerLink';
import type { InstructionData } from '@entities/idl/formatters/formatted-idl';
import { useParsedLogs } from '@entities/program-logs';
import { useToast } from '@shared/ui/sonner/use-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';

import { originalIdlAtom, programIdAtom } from '../model/state-atoms';
import { isEnabled, useInstruction } from '../model/use-instruction';
import type { InstructionCallParams } from '../model/use-instruction-form';
import { useMainnetConfirmation } from '../model/use-mainnet-confirmation';
import { BaseWarningCard } from './BaseWarningCard';
import { InteractWithIdlView } from './InteractWithIdlView';
import { MainnetWarningDialog } from './MainnetWarningDialog';

export function InteractWithIdl({
    data: instructions,
}: {
    data?: InstructionData[];
    onClusterSelect?: () => void;
    onWalletConnect?: () => void;
    onSendTransaction?: (instruction: string, data: any) => void;
}) {
    const toast = useToast();
    const idl = useAtomValue(originalIdlAtom);
    const progId = useAtomValue(programIdAtom);
    const { connected, publicKey } = useWallet();
    const { invokeInstruction, initializationError, isExecuting, lastError, lastSuccess, logs, transactionError } =
        useInstruction({
            enabled: isEnabled({ connected, idl, programId: progId, publicKey }),
            idl,
            programId: progId?.toString(),
        });
    const { parseLogs } = useParsedLogs(transactionError);

    const { requireConfirmation, confirm, cancel, isOpen, hasPendingAction } = useMainnetConfirmation<{
        data: InstructionData;
        params: InstructionCallParams;
    }>();

    const handleExecuteInstruction = useCallback(
        async (data: InstructionData, params: InstructionCallParams) => {
            await requireConfirmation(
                async () => {
                    await invokeInstruction(data.name, data, params);
                },
                { data, params }
            );
        },
        [invokeInstruction, requireConfirmation]
    );

    const handleTransactionSuccess = useCallback(
        (txSignature: string) => {
            // do not show tx banner
            return;
            toast.brand({
                description: (
                    <ExplorerLink
                        path={`/tx/${txSignature}`}
                        className="e-shrink-0 e-text-xs"
                        label="View Transaction"
                    />
                ),
                title: 'Transaction is sent',
                type: 'success',
            });
        },
        [toast]
    );

    const handleTransactionError = useCallback(
        (error: string) => {
            toast.brand({ description: error, title: 'Transaction Failed', type: 'error' });
        },
        [toast]
    );

    if (initializationError) {
        return (
            <BaseWarningCard
                message={`Unable to initialize program for interaction: ${initializationError}`}
                description="You can still view the IDL structure above."
            />
        );
    }

    return !(idl && progId) ? (
        <LoadingCard />
    ) : (
        <>
            <InteractWithIdlView
                instructions={instructions || []}
                idl={idl}
                onExecuteInstruction={handleExecuteInstruction}
                onTransactionSuccess={handleTransactionSuccess}
                onTransactionError={handleTransactionError}
                isExecuting={isExecuting}
                lastError={lastError}
                lastSuccess={lastSuccess}
                logs={logs}
                parseLogs={parseLogs}
            />
            {hasPendingAction && (
                <MainnetWarningDialog
                    open={isOpen}
                    onOpenChange={open => {
                        if (!open) {
                            cancel();
                        }
                    }}
                    onConfirm={confirm}
                    onCancel={cancel}
                />
            )}
        </>
    );
}
