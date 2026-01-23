import { truncateAddress } from '@entities/address';

import { Cluster, clusterName } from '@/app/utils/cluster';

import { getTokenInfo, type TokenInfo } from '../api/get-token-info';
import { getTx } from '../api/get-tx';
import { formatDate, lamportsToSolString } from '../lib/utils';
import type { FormattedReceipt } from '../types';
import { createSolTransferReceipt } from './sol-transfer';
import { createTokenTransferReceipt } from './token-transfer';

export async function createReceipt(signature: string): Promise<FormattedReceipt | null> {
    const data = await getTx(signature);

    const receipt =
        createSolTransferReceipt(data.transaction) ||
        (await createTokenTransferReceipt(data.transaction, (mint: string | undefined) =>
            getTokenSymbol(mint, data.cluster)
        ));

    if (!receipt) return null;

    return {
        ...receipt,
        date: formatDate(receipt.date),
        fee: lamportsToSolString(receipt.fee, 9),
        network: clusterName(data.cluster),
        receiver: truncateAddress(receipt.receiver, 5),
        sender: truncateAddress(receipt.sender, 5),
        total: receipt.type === 'sol' ? lamportsToSolString(receipt.total, 9) : String(receipt.total),
    };
}

async function getTokenSymbol(mint: string | undefined, cluster: Cluster): Promise<TokenInfo | undefined> {
    if (!mint) return undefined;
    try {
        const tokenInfo = await getTokenInfo(mint, cluster);
        return tokenInfo;
    } catch (error) {
        return undefined;
    }
}
