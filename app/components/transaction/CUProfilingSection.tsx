import { CUProfilingCard } from '@components/transaction/CUProfilingCard';
import { useCluster } from '@providers/cluster';
import { useTransactionDetails } from '@providers/transactions';
import { extractCUDataFromTransaction } from '@utils/cu-profiling';
import { SignatureProps } from '@utils/index';
import { InstructionLogs, parseProgramLogs } from '@utils/program-logs';
import React from 'react';

export function CUProfilingSection({ signature }: SignatureProps) {
    const { cluster } = useCluster();
    const details = useTransactionDetails(signature);

    const transactionWithMeta = details?.data?.transactionWithMeta;
    const logMessages = transactionWithMeta?.meta?.logMessages || null;
    const err = transactionWithMeta?.meta?.err || null;
    const epoch = transactionWithMeta?.slot ? BigInt(transactionWithMeta.slot) : undefined;

    const instructionLogs: InstructionLogs[] = React.useMemo(
        () => (logMessages ? parseProgramLogs(logMessages, err, cluster) : []),
        [logMessages, err, cluster]
    );

    const instructionsForCU = React.useMemo(() => {
        if (!transactionWithMeta) return [];

        return extractCUDataFromTransaction({
            cluster,
            epoch,
            instructionLogs,
            instructions: transactionWithMeta.transaction.message.instructions,
        });
    }, [transactionWithMeta, instructionLogs, cluster, epoch]);

    if (!transactionWithMeta) return null;
    if (!logMessages || logMessages.length === 0) return null;
    if (instructionsForCU.length === 0) return null;

    return <CUProfilingCard instructions={instructionsForCU} />;
}
