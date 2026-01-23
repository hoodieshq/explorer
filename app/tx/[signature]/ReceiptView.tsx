'use client';

import { ErrorCard } from '@components/common/ErrorCard';
import { InfoTooltip } from '@components/common/InfoTooltip';
import { LoadingCard } from '@components/common/LoadingCard';
import { SignatureContext } from '@components/instruction/SignatureContext';
import { Badge } from '@components/shared/ui/badge';
import { cn } from '@components/shared/utils';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { useFetchTransactionStatus, useTransactionDetails, useTransactionStatus } from '@providers/transactions';
import { useFetchTransactionDetails } from '@providers/transactions/parsed';
import { ParsedInstruction, PublicKey, TransactionSignature } from '@solana/web3.js';
import { MEMO_PROGRAM_ADDRESS } from '@solana-program/memo';
import { ClusterStatus } from '@utils/cluster';
import { displayTimestamp, displayTimestampUtc } from '@utils/date';
import { lamportsToSolString } from '@utils/index';
import Link from 'next/link';
import React, { useEffect } from 'react';
import { Info } from 'react-feather';

import { truncateAddress } from '@/app/entities/address/lib/utils';
import { dollar } from '@/app/features/receipt/ui/images';

import { AUTO_REFRESH_INTERVAL, AutoRefresh, AutoRefreshProps } from './page-client';

const MEMO_PROGRAM_ID = new PublicKey(MEMO_PROGRAM_ADDRESS);

interface IReceiptViewProps {
    signature: TransactionSignature;
}

export function ReceiptView({ signature, autoRefresh }: IReceiptViewProps & AutoRefreshProps) {
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

interface IReceiptData {
    date?: number;
    memo?: string;
    fee?: string;
    network?: string;
    receiver?: string;
    sender?: string;
    lamports?: number;
    confirmationStatus?: string;
}

function BluredCircle () {
    return (
        <div className="e-absolute e-rounded-full e-bg-emerald-700 e-top-[55%] e-left-[50%] e-w-1/3 e-h-2/5 e-translate-x-[-50%] e-translate-y-[-50%] e-blur-[150px] e-z-[-1]"/>
    );
}

function Zigzag () {
    return (
        <div className="zigzag e-bg-outer-space-900 e-pb-6"/>
    );
}

function BaseReceipt({ date, sender, receiver, network, fee, lamports, memo, confirmationStatus }: IReceiptData) {
    return (
        <div className="e-w-full e-max-w-lg">
            <div className="e-bg-outer-space-900">
                <Header date={date} />
                <Content
                    sender={sender}
                    receiver={receiver}
                    network={network}
                    confirmationStatus={confirmationStatus}
                />
                <div className="e-my-5 e-border-t [border-top-style:dashed] e-border-white/10" />
                <Footer fee={fee} lamports={lamports} memo={memo} />
            </div>
            <Zigzag />
        </div>
    );
}

function Header({ date }: {date: IReceiptData['date']}) {
    return (
        <div className="e-flex e-items-center e-justify-between e-border-b e-border-white/10 e-p-6 e-pt-8 [border-bottom-style:solid] e-gap-x-4">
            <h3 className="e-m-0 e-font-medium e-text-white e-flex-shrink-0">Solana Receipt</h3>

            {date && 
                <InfoTooltip text={displayTimestampUtc(date, true)} withHelpIcon={false} right>
                    <span className="e-font-mono e-text-right e-text-sm e-text-gray-400">{displayTimestamp(date, true)}</span>
                </InfoTooltip>
            }
        </div>
    );
}

function Content({
    sender,
    receiver,
    network,
    confirmationStatus,
}: IReceiptData) {
    return (
        <div className="e-p-6 e-pt-8 e-grid e-gap-6 e-grid-cols-2 e-text-sm e-text-gray-400">
            <ListItem label="Sender" tooltipText={sender || ""} value={sender && truncateAddress(sender, 8, 8)} />
            <ListItem label="Receiver" tooltipText={receiver || ""} value={receiver && truncateAddress(receiver, 8, 8)} />
            <span>Status</span>
            <div className="e-text-right">
                <Badge size="sm" variant="success">
                    {confirmationStatus ? confirmationStatus.charAt(0).toUpperCase() + confirmationStatus.slice(1).toLowerCase() : 'Unknown'}
                </Badge>
            </div>
            <ListItem label="Network" className='e-text-white' value={network} />
        </div>
    );
}

function ListItem({ label, value, className, tooltipText }: { label: string; value?: string; className?: string; tooltipText?: string }) {
    if (!value) return null;

    return (
        <>
            <span>{label}</span>
            <InfoTooltip text={tooltipText} withHelpIcon={false} right>
                <span className={cn("e-font-mono e-text-green-400 e-text-right e-truncate", className)} title={value}>
                    {value}
                </span>
            </InfoTooltip>
        </>
    );
}

function Footer({ fee, lamports, memo }: IReceiptData) {
    return (
        <div className="e-p-6 e-pt-0 e-text-xs e-text-gray-400">
            <div className="e-grid e-grid-cols-2 e-items-center">
                <span className="e-text-white">Total</span>
                <InfoTooltip text={lamports?.toString()} withHelpIcon={false} right> 
                    <Total total={lamports ? lamportsToSolString(lamports, 9) : 'N/A'} />
                </InfoTooltip>
                <span>Fee</span>
                <span className='e-text-right'>{fee || 'N/A'}</span>
            </div>

            {memo && 
                <div className="e-flex e-flex-col e-mt-3 e-gap-1">
                    <span>Memo</span>
                    <span className="e-text-xs e-text-white">{memo}</span>
                </div>
            }
        </div>
    );
}

function Total({ total }: { total: string }) {
    return (
        <div className="e-flex e-items-center e-gap-2 e-justify-end">
            <img alt="SOL token icon" src={dollar} height="20" width="20" className="e-flex-shrink-0" />
            <span className="e-text-2xl e-text-white">{total}</span>
        </div>
    );
}


