'use client';

import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { SignatureContext } from '@components/instruction/SignatureContext';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { useFetchTransactionStatus, useTransactionDetails, useTransactionStatus } from '@providers/transactions';
import { useFetchTransactionDetails } from '@providers/transactions/parsed';
import { ParsedInstruction, PublicKey, TransactionSignature } from '@solana/web3.js';
import { MEMO_PROGRAM_ADDRESS } from '@solana-program/memo';
import { ClusterStatus } from '@utils/cluster';
import { lamportsToSolString } from '@utils/index';
import Link from 'next/link';
import React, { useEffect } from 'react';
import { Info } from 'react-feather';

import { AUTO_REFRESH_INTERVAL, AutoRefresh, type AutoRefreshProps } from '@/app/tx/[signature]/page-client';

import { BaseReceipt, Header, Zigzag } from './BaseReceipt';

const MEMO_PROGRAM_ID = new PublicKey(MEMO_PROGRAM_ADDRESS);

interface IReceiptProps {
    signature: TransactionSignature;
}

export function Receipt({ signature, autoRefresh }: IReceiptProps & AutoRefreshProps) {
    const fetchStatus = useFetchTransactionStatus();
    const fetchDetails = useFetchTransactionDetails();
    const status = useTransactionStatus(signature); // getTransaction на странице транзакции чтобы зафетчить транзакцию
    const details = useTransactionDetails(signature);
    const { status: clusterStatus, name: network } = useCluster();
    
    // Fetch transaction on load
    useEffect(() => {
        if (!status && clusterStatus === ClusterStatus.Connected) {
            fetchStatus(signature);
        }
        if (!details && clusterStatus === ClusterStatus.Connected && status?.status === FetchStatus.Fetched) {
            fetchDetails(signature);
        }
    }, [signature, clusterStatus, status, fetchDetails, details]); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect to set and clear interval for auto-refresh
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
            <div className="container e-flex e-flex-col e-items-center e-justify-center e-gap-6 e-px-5 e-py-10 e-min-h-[90vh]">
                <BluredCircle />
                
                <div className="e-w-full e-max-w-lg">
                    <div className="e-bg-outer-space-900 e-min-h-96">
                        <Header date={Date.now()} />
                        <div className="e-p-6 e-text-destructive e-space-x-1">
                            <Info size={16} />
                            <span>There is no receipt for this transaction</span>
                        </div>
                    </div>
                    <Zigzag />
                </div>

                <Link href={`/tx/${signature}`} className="btn btn-white btn-sm me-2">
                    View transaction in Explorer
                </Link>
            </div>
        );
    }

    const { info } = status.data;

    const transactionWithMeta = details?.data?.transactionWithMeta;
    const fee = transactionWithMeta?.meta?.fee;
    const transaction = transactionWithMeta?.transaction;

    const instruction = transaction?.message.instructions.find(instruction => 'parsed' in instruction && "lamports" in instruction.parsed.info) as ParsedInstruction | undefined;
    const memoInstruction = transaction?.message.instructions.find(
        instruction =>
            'parsed' in instruction &&
            (instruction.programId.equals(MEMO_PROGRAM_ID))
    ) as ParsedInstruction | undefined;

    const memo = memoInstruction?.parsed || '';
    const sender = instruction?.parsed.info.source;
    const receiver = instruction?.parsed.info.destination;
    const lamports = instruction?.parsed.info.lamports;

    const receiptData = {
        confirmationStatus: info.confirmationStatus,
        date: info.timestamp !== 'unavailable' ? info.timestamp * 1000 : undefined,
        fee: fee ? `${lamportsToSolString(fee, 8)} SOL` : undefined,
        lamports,
        memo,
        network,
        receiver,
        sender,
    };

    return (
        <SignatureContext.Provider value={signature}>
            <div className="container e-flex e-flex-col e-items-center e-justify-center e-gap-6 e-px-5 e-py-10 e-min-h-[90vh]">
                <BluredCircle />
                <BaseReceipt {...receiptData} />
                <Link href={`/tx/${signature}`} className="btn btn-white btn-sm me-2">
                    View transaction in Explorer
                </Link>
            </div>
        </SignatureContext.Provider>
    );
}

function BluredCircle () {
    return (
        <div className="e-absolute e-rounded-full e-bg-emerald-700 e-top-[55%] e-left-[50%] e-w-1/3 e-h-2/5 e-translate-x-[-50%] e-translate-y-[-50%] e-blur-[150px] e-z-[-1]"/>
    );
}


