'use client';

import { getTransactionRows } from '@components/account/HistoryCardComponents';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { type TransactionWithMeta } from '@entities/transaction-data';
import { useFetchAccountHistory } from '@features/transaction-history/model/use-fetch-account-history';
import { useAccountHistory } from '@providers/accounts';
import { FetchStatus } from '@providers/cache';
import { address as toAddress } from '@solana/kit';
import { ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { getTokenInstructionName, InstructionContainer } from '@utils/instruction';
import React, { useMemo } from 'react';

import { BaseTokenInstructionsCard, type TokenInstructionRowView } from './BaseTokenInstructionsCard';
import { extractMintDetails, MintDetails } from './common';

export function TokenInstructionsCard({ address }: { address: string }) {
    const pubkey = useMemo(() => new PublicKey(address), [address]);
    const history = useAccountHistory(address);
    const fetchAccountHistory = useFetchAccountHistory();
    const refresh = () => fetchAccountHistory(toAddress(address), true, true);
    const loadMore = () => fetchAccountHistory(toAddress(address), true);

    const transactionRows = React.useMemo(() => {
        if (history?.data?.fetched) {
            return getTransactionRows(history.data.fetched);
        }
        return [];
    }, [history]);

    React.useEffect(() => {
        if (!history || !history.data?.transactionMap?.size) {
            refresh();
        }
    }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

    const rows = React.useMemo(() => {
        const detailedHistoryMap = history?.data?.transactionMap || new Map<string, TransactionWithMeta>();
        const rows: TokenInstructionRowView[] = [];
        const mintMap = new Map<string, MintDetails>();

        transactionRows.forEach(({ signatureInfo, signature, blockTime, err }) => {
            const transactionWithMeta = detailedHistoryMap.get(signature);
            if (!transactionWithMeta) return;

            extractMintDetails(transactionWithMeta, mintMap);

            const instructions: (ParsedInstruction | PartiallyDecodedInstruction)[] = [];

            InstructionContainer.create(transactionWithMeta).instructions.forEach(({ instruction, inner }) => {
                if (isRelevantInstruction(pubkey, address, mintMap, instruction)) {
                    instructions.push(instruction);
                }
                instructions.push(
                    ...inner.filter(instruction => isRelevantInstruction(pubkey, address, mintMap, instruction)),
                );
            });

            instructions.forEach((ix, index) => {
                const instructionName = getTokenInstructionName(ix, signatureInfo);

                if (instructionName) {
                    rows.push({
                        blockTime,
                        instructionName,
                        key: signature + index,
                        programId: toAddress(ix.programId.toBase58()),
                        signature,
                        status: err ? 'failed' : 'success',
                    });
                }
            });
        });

        return rows;
    }, [history, transactionRows, address, pubkey]);

    if (!history) {
        return null;
    }

    if (history?.data === undefined) {
        if (history.status === FetchStatus.Fetching) {
            return <LoadingCard message="Loading token instructions" />;
        }

        return <ErrorCard retry={refresh} text="Failed to fetch token instructions" />;
    }

    return (
        <BaseTokenInstructionsCard
            rows={rows}
            fetching={history.status === FetchStatus.Fetching}
            failed={history.status === FetchStatus.FetchFailed}
            foundOldest={history.data.foundOldest}
            onRefresh={refresh}
            onLoadMore={loadMore}
        />
    );
}

function isRelevantInstruction(
    pubkey: PublicKey,
    address: string,
    mintMap: Map<string, MintDetails>,
    instruction: ParsedInstruction | PartiallyDecodedInstruction,
) {
    if ('accounts' in instruction) {
        return instruction.accounts.some(
            account => account.equals(pubkey) || mintMap.get(account.toBase58())?.mint === address,
        );
    } else if (typeof instruction.parsed === 'object' && 'info' in instruction.parsed) {
        return Object.values(instruction.parsed.info).some(
            value => value === address || (typeof value === 'string' && mintMap.get(value)?.mint === address),
        );
    }
    return false;
}
