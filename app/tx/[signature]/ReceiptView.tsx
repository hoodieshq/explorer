'use client';

import { Badge } from '@/app/components/shared/ui/badge';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { SignatureContext } from '@components/instruction/SignatureContext';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { useFetchTransactionStatus, useTransactionDetails, useTransactionStatus } from '@providers/transactions';
import { useFetchTransactionDetails } from '@providers/transactions/parsed';
import { TransactionSignature } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import { displayTimestamp } from '@utils/date';
import Link from 'next/link';
import React, { useEffect } from 'react';

type Props = {
    signature: TransactionSignature;
};

export function ReceiptView({ signature }: Props) {
    const fetchStatus = useFetchTransactionStatus();
    const status = useTransactionStatus(signature);
    const details = useTransactionDetails(signature);
    const fetchDetails = useFetchTransactionDetails();
    const { clusterInfo, status: clusterStatus } = useCluster();

    // Fetch transaction on load
    useEffect(() => {
        if (!status && clusterStatus === ClusterStatus.Connected) {
            fetchStatus(signature);
        }
    }, [signature, clusterStatus, fetchStatus, status]);

    // Fetch details on load
    useEffect(() => {
        if (!details && clusterStatus === ClusterStatus.Connected && status?.status === FetchStatus.Fetched) {
            fetchDetails(signature);
        }
    }, [signature, clusterStatus, status, fetchDetails, details]);

    if (!status || status.status === FetchStatus.Fetching) {
        return (
            <div className="container">
                <LoadingCard message="Loading transaction details" />
            </div>
        );
    }

    if (status.status === FetchStatus.FetchFailed) {
        return (
            <div className="container">
                <ErrorCard retry={() => fetchStatus(signature)} text="Failed to fetch transaction" />
            </div>
        );
    }

    if (!status.data?.info) {
        return (
            <div className="container">
                <ErrorCard text="Transaction not found" />
            </div>
        );
    }

    const { info } = status.data;
    const transactionWithMeta = details?.data?.transactionWithMeta;
    const transaction = transactionWithMeta?.transaction;
    const meta = transactionWithMeta?.meta;

    const timestamp = info.timestamp !== 'unavailable' ? displayTimestamp(info.timestamp * 1000) : '';

    const statusText = info.result.err ? 'Failed' : 'Success';
    const networkName = clusterInfo ? 'Mainnet' : 'Unknown';

    return (
        <SignatureContext.Provider value={signature}>
            <div className="container e-flex e-flex-col e-items-center e-justify-center e-gap-6 e-px-5 e-py-10">
                <div className="e-receipt-zigzag e-relative e-w-full e-max-w-lg e-overflow-hidden e-rounded-t-2xl e-bg-[#29302C] e-pb-6">
                    <div className="e-flex e-items-center e-justify-between e-border-b e-border-white/10 e-p-6 e-pt-8 [border-bottom-style:solid]">
                        <h3 className="e-m-0 e-font-medium e-text-white">Solana Receipt</h3>
                        <span className="e-font-mono e-text-sm e-text-gray-400">{timestamp}</span>
                    </div>

                    <div className="e-space-y-3 e-p-6">
                        <div className="e-flex e-items-center e-justify-between  e-gap-3">
                            <span className="e-w-20 e-text-sm e-text-gray-400">Sender</span>
                            <span className="e-truncate e-font-mono e-text-sm e-text-green-400">address</span>
                        </div>

                        <div className="e-flex e-items-center e-justify-between  e-gap-3">
                            <span className="e-w-20 e-text-sm e-text-gray-400">Receiver</span>
                            <span className="e-truncate e-font-mono e-text-sm e-text-green-400">address</span>
                        </div>

                        <div className="e-flex e-items-center e-justify-between e-gap-3">
                            <span className="e-w-20 e-text-sm e-text-gray-400">Status</span>
                            <Badge size="sm">{statusText}</Badge>
                        </div>

                        <div className="e-flex e-items-center e-justify-between  e-gap-3">
                            <span className="e-w-20 e-text-sm e-text-gray-400">Network</span>
                            <span className="e-text-sm e-text-white">{networkName}</span>
                        </div>
                    </div>

                    <div className="e-my-5 e-border-t e-border-dashed e-border-white/10" />

                    <div className="e-flex e-items-center e-justify-between e-p-6">
                        <div>
                            <div className="e-mb-2 e-text-lg e-font-medium e-text-white">
                                <span>Total</span>
                                <span>0</span>
                            </div>
                            <div className="e-text-xs e-text-gray-400">
                                <span>Fee:</span> <span>0 SOL</span>
                            </div>
                            <div className="e-text-xs e-text-gray-400">
                                <span>Payment:</span> <span>0</span>
                            </div>
                        </div>
                    </div>
                </div>
                <Link href={`/tx/${signature}`} className="btn btn-white btn-sm me-2">
                    View transaction in Explorer
                </Link>
            </div>
        </SignatureContext.Provider>
    );
}
