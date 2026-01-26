'use client';

import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { SignatureContext } from '@components/instruction/SignatureContext';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { useFetchTransactionStatus, useTransactionDetails, useTransactionStatus } from '@providers/transactions';
import { useFetchTransactionDetails } from '@providers/transactions/parsed';
import { TransactionSignature } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React, { useEffect } from 'react';
import { Info } from 'react-feather';
import useSWR from 'swr';

import { getProxiedUri } from '@/app/features/metadata';
import { AUTO_REFRESH_INTERVAL, AutoRefresh, type AutoRefreshProps } from '@/app/tx/[signature]/page-client';

import { extractReceiptData } from '../model/create-receipt';
import { BaseReceipt, Header, NoReceipt, Zigzag } from './BaseReceipt';

interface ReceiptProps {
    signature: TransactionSignature;
}

export function Receipt({ signature, autoRefresh }: ReceiptProps & AutoRefreshProps) {
    const fetchStatus = useFetchTransactionStatus();
    const fetchDetails = useFetchTransactionDetails();
    const status = useTransactionStatus(signature);
    const details = useTransactionDetails(signature);
    const { status: clusterStatus, cluster } = useCluster();
    const transactionPath = useClusterPath({ pathname: `/tx/${signature}` });

    const tx = details?.data?.transactionWithMeta;
    const { data: receipt } = useSWR(tx && cluster ? ['receipt', tx, cluster] : null, () =>
        extractReceiptData(tx!, cluster)
    );

    useEffect(() => {
        if (!status && clusterStatus === ClusterStatus.Connected) {
            fetchStatus(signature);
        }
        if (!details && clusterStatus === ClusterStatus.Connected && status?.status === FetchStatus.Fetched) {
            fetchDetails(signature);
        }
    }, [signature, clusterStatus, status, fetchDetails, details]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (autoRefresh === AutoRefresh.Active) {
            const intervalHandle: NodeJS.Timeout = setInterval(() => fetchStatus(signature), AUTO_REFRESH_INTERVAL);

            return () => {
                clearInterval(intervalHandle);
            };
        }
    }, [autoRefresh, fetchStatus, signature]);

    if (!status || (status.status === FetchStatus.Fetching && autoRefresh === AutoRefresh.Inactive)) {
        return <LoadingCard message="Loading transaction details" />;
    } else if (status.status === FetchStatus.FetchFailed) {
        return <ErrorCard retry={() => fetchStatus(signature)} text="Fetch Failed" />;
    } else if (!status.data?.info) {
        return (
            <div className="container e-flex e-min-h-[90vh] e-flex-col e-items-center e-justify-center e-gap-6 e-px-5 e-py-10">
                <BluredCircle />

                <div className="e-w-full e-max-w-lg">
                    <div className="e-min-h-96 e-bg-outer-space-900">
                        <Header date={{ timestamp: new Date().getTime(), utc: new Date().toISOString() }} />
                        <div className="e-space-x-1 e-p-6 e-text-destructive">
                            <Info size={16} />
                            <span>There is no receipt for this transaction</span>
                        </div>
                    </div>
                    <Zigzag />
                </div>

                <Link
                    href={transactionPath}
                    className="btn btn-white btn-sm me-2"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View transaction in Explorer
                </Link>
            </div>
        );
    }

    if (!receipt) return <NoReceipt />;

    const logoURI = receipt.logoURI ? getProxiedUri(receipt.logoURI) : undefined;

    return (
        <SignatureContext.Provider value={signature}>
            <div className="container e-flex e-min-h-[90vh] e-flex-col e-items-center e-justify-center e-gap-6 e-px-5 e-py-10">
                <BluredCircle />
                <BaseReceipt data={{ ...receipt, confirmationStatus: status.data?.info.confirmationStatus, logoURI }} />
                <Link
                    href={transactionPath}
                    className="btn btn-white btn-sm me-2"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View transaction in Explorer
                </Link>
            </div>
        </SignatureContext.Provider>
    );
}

function BluredCircle() {
    return (
        <div className="e-absolute e-left-[50%] e-top-[55%] e-z-[-1] e-h-2/5 e-w-1/3 e-translate-x-[-50%] e-translate-y-[-50%] e-rounded-full e-bg-emerald-700 e-blur-[150px]" />
    );
}
