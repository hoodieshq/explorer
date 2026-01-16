import { Connection, LAMPORTS_PER_SOL, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';

import { Cluster, clusterName, serverClusterUrl } from '@/app/utils/cluster';
import { displayTimestampUtc } from '@/app/utils/date';
import { PROGRAM_INFO_BY_ID, PROGRAM_NAMES } from '@/app/utils/programs';

export type ApiReceiptData = {
    sender?: string;
    receiver?: string;
    date?: string;
    description?: string;
    network?: string;
    fee?: string;
    total?: string;
};

export async function getData(signature: string, searchParams: URLSearchParams): Promise<ApiReceiptData> {
    const customUrl = searchParams.get('customUrl') || '';

    const cluster = await findTransactionCluster(signature, customUrl);

    if (!cluster) {
        throw new Error('Cluster not found');
    }

    const rpcUrl = serverClusterUrl(cluster, customUrl);
    const transaction = await fetchTransactionDetails(signature, rpcUrl);

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    return extractReceiptData(transaction, cluster);
}

// ============================================================================
// Extraction Functions
// ============================================================================
function extractReceiptData(transaction: ParsedTransactionWithMeta, cluster: Cluster): ApiReceiptData {
    const { transaction: tx, meta, blockTime } = transaction;

    return {
        date: formatDate(blockTime),
        description: extractDescription(tx),
        fee: formatFee(meta?.fee),
        network: clusterName(cluster),
        receiver: extractReceiver(tx, meta),
        sender: extractSender(tx),
        total: extractTotal(meta),
    };
}

function extractSender(transaction: ParsedTransactionWithMeta['transaction']): string | undefined {
    const senderAccount = transaction?.message?.accountKeys?.[0];
    if (!senderAccount) {
        return undefined;
    }
    return senderAccount.pubkey.toString();
}

function extractReceiver(
    transaction: ParsedTransactionWithMeta['transaction'],
    meta: ParsedTransactionWithMeta['meta']
): string | undefined {
    if (!meta?.preBalances || !meta?.postBalances || !transaction?.message?.accountKeys) {
        return undefined;
    }

    let maxDelta = 0;
    let receiverIndex = -1;

    // Skip first account (sender) and find account with largest positive delta
    for (let i = 1; i < transaction.message.accountKeys.length; i++) {
        const delta = meta.postBalances[i] - meta.preBalances[i];
        if (delta > maxDelta) {
            maxDelta = delta;
            receiverIndex = i;
        }
    }

    if (receiverIndex < 0) {
        return undefined;
    }

    const receiverAccount = transaction.message.accountKeys[receiverIndex];
    return receiverAccount.pubkey.toString();
}

function extractDescription(transaction: ParsedTransactionWithMeta['transaction']): string | undefined {
    const instructions = transaction?.message?.instructions || [];

    for (const instruction of instructions) {
        const programId = getProgramId(instruction);
        if (!isMemoProgram(programId)) {
            continue;
        }

        const memo = extractMemoFromInstruction(instruction);
        if (memo) {
            return memo;
        }
    }

    return undefined;
}

function extractTotal(meta: ParsedTransactionWithMeta['meta']): string | undefined {
    if (!meta?.preBalances || !meta?.postBalances) {
        return undefined;
    }

    let totalLamports = 0;
    for (let i = 0; i < meta.postBalances.length; i++) {
        const delta = meta.postBalances[i] - meta.preBalances[i];
        if (delta > 0) {
            totalLamports += delta;
        }
    }

    return totalLamports > 0 ? lamportsToSolString(totalLamports, 2) : undefined;
}

// ============================================================================
// Formatting utils
// ============================================================================
function lamportsToSol(lamports: number | bigint): number {
    if (typeof lamports === 'number') {
        return lamports / LAMPORTS_PER_SOL;
    }

    let signMultiplier = 1;
    if (lamports < 0) {
        signMultiplier = -1;
    }

    const absLamports = lamports < 0 ? -lamports : lamports;
    const lamportsString = absLamports.toString(10).padStart(10, '0');
    const splitIndex = lamportsString.length - 9;
    const solString = lamportsString.slice(0, splitIndex) + '.' + lamportsString.slice(splitIndex);
    return signMultiplier * parseFloat(solString);
}

function lamportsToSolString(lamports: number | bigint, maximumFractionDigits = 9): string {
    const sol = lamportsToSol(lamports);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(sol);
}

function formatFee(fee: number | undefined): string | undefined {
    return fee ? lamportsToSolString(fee, 9) : undefined;
}

function formatDate(blockTime: number | null | undefined): string | undefined {
    if (!blockTime) {
        return undefined;
    }
    // TODO: This should be client time, not UTC.
    return displayTimestampUtc(blockTime * 1000, true);
}

// ============================================================================
// Instruction parsing utils
// ============================================================================
function getProgramId(
    instruction: ParsedTransactionWithMeta['transaction']['message']['instructions'][0]
): string | undefined {
    if ('programId' in instruction && instruction.programId) {
        return instruction.programId.toString();
    }
    if ('program' in instruction && instruction.program) {
        return instruction.program;
    }
    return undefined;
}

function isMemoProgram(programId: string | undefined): boolean {
    // TODO: Do we need a legacy memo program id?
    const memoProgramIdString = Object.keys(PROGRAM_INFO_BY_ID).find(
        key => PROGRAM_INFO_BY_ID[key]?.name === PROGRAM_NAMES.MEMO
    )!;
    const memoProgramId = new PublicKey(memoProgramIdString);
    if (!programId) {
        return false;
    }
    try {
        const programPubkey = new PublicKey(programId);
        return programPubkey.equals(memoProgramId);
    } catch {
        return programId === memoProgramId.toString() || programId === 'spl-memo';
    }
}

function extractMemoFromInstruction(
    instruction: ParsedTransactionWithMeta['transaction']['message']['instructions'][0]
): string | undefined {
    if (!('parsed' in instruction)) {
        return undefined;
    }

    const parsed = instruction.parsed;

    if (typeof parsed === 'string') {
        return parsed;
    }

    if (typeof parsed === 'object' && parsed !== null && 'memo' in parsed) {
        const memoObj = parsed as { memo?: string };
        return memoObj.memo;
    }

    return undefined;
}

// ============================================================================
// RPC utils
// ============================================================================
async function findTransactionCluster(signature: string, customUrl: string): Promise<Cluster | null> {
    const clustersToTry: Cluster[] = [Cluster.MainnetBeta, Cluster.Devnet, Cluster.Testnet];

    const clusterChecks = clustersToTry.map(async (cluster): Promise<Cluster | null> => {
        const rpcUrl = serverClusterUrl(cluster, customUrl);
        const connection = new Connection(rpcUrl, 'confirmed');

        try {
            const status = await connection.getSignatureStatus(signature, {
                searchTransactionHistory: true,
            });

            if (status?.value !== null) {
                return cluster;
            }
        } catch (error) {
            return null;
        }

        return null;
    });

    const results = await Promise.allSettled(clusterChecks);

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value !== null) {
            return result.value;
        }
    }

    return null;
}

async function fetchTransactionDetails(signature: string, rpcUrl: string): Promise<ParsedTransactionWithMeta> {
    const rpcRequestConfig = {
        maxSupportedTransactionVersion: 0,
    };
    const connection = new Connection(rpcUrl, 'confirmed');

    try {
        let transaction = await connection.getParsedTransaction(signature, {
            ...rpcRequestConfig,
            commitment: 'confirmed',
        });

        if (transaction) {
            return transaction;
        }

        transaction = await connection.getParsedTransaction(signature, {
            ...rpcRequestConfig,
            commitment: 'finalized',
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        return transaction;
    } catch (error) {
        throw new Error('Failed to fetch transaction', { cause: error });
    }
}
