import { BaseInstructionCard } from '@components/common/BaseInstructionCard';
import { useCluster } from '@providers/cluster';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ComputeBudgetProgram, MessageCompiledInstruction, VersionedMessage, AddressLookupTableAccount } from '@solana/web3.js';
import { getProgramName } from '@utils/tx';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useAnchorProgram } from '@/app/providers/anchor';

import AnchorDetailsCard from '../instruction/AnchorDetailsCard';
import { ComputeBudgetDetailsCard } from '../instruction/ComputeBudgetDetailsCard';
import { AssociatedTokenDetailsCard } from './associated-token/AssociatedTokenDetailsCard';
import { intoParsedInstruction } from './into-parsed-data';
import { UnknownDetailsCard } from './UnknownDetailsCard';
import { intoTransactionInstructionFromVersionedMessage } from './utils';

export function InstructionsSection({ message }: { message: VersionedMessage }) {
    return (
        <>
            {message.compiledInstructions.map((ix, index) => {
                return <InspectorInstructionCard key={index} {...{ index, ix, message }} />;
            })}
        </>
    );
}

function InspectorInstructionCard({
    message,
    ix,
    index,
}: {
    message: VersionedMessage;
    ix: MessageCompiledInstruction;
    index: number;
}) {
    const { cluster, url } = useCluster();
    const [lookupTableAccounts, setLookupTableAccounts] = React.useState<AddressLookupTableAccount[]>([]);

    // Fetch lookup table accounts if needed
    React.useEffect(() => {
        if (message.addressTableLookups.length === 0) return;

        const fetchLookupTableAccounts = async () => {
            try {
                // Import dynamically to avoid circular dependencies
                const { Connection } = await import('@solana/web3.js');
                const connection = new Connection(url);

                // Get lookup table addresses
                const lookupTableAddresses = message.addressTableLookups.map(
                    lookup => lookup.accountKey
                );

                // Fetch each lookup table account manually
                const accounts: AddressLookupTableAccount[] = [];

                for (const address of lookupTableAddresses) {
                    try {
                        const accountInfo = await connection.getAccountInfo(address);
                        if (accountInfo) {
                            const lookupTableAccount = new AddressLookupTableAccount({
                                key: address,
                                state: AddressLookupTableAccount.deserialize(accountInfo.data),
                            });
                            accounts.push(lookupTableAccount);
                        }
                    } catch (error) {
                        console.error(`Failed to fetch lookup table account ${address.toString()}:`, error);
                    }
                }

                setLookupTableAccounts(accounts);
            } catch (error) {
                console.error('Failed to fetch lookup table accounts:', error);
            }
        };

        fetchLookupTableAccounts();
    }, [message.addressTableLookups, url]);

    const transactionInstruction = intoTransactionInstructionFromVersionedMessage(ix, message, lookupTableAccounts);

    const programId = transactionInstruction.programId;
    const programName = getProgramName(programId.toBase58(), cluster);
    const anchorProgram = useAnchorProgram(programId.toString(), url);

    if (anchorProgram.program) {
        return (
            <ErrorBoundary
                fallback={
                    <UnknownDetailsCard
                        key={index}
                        index={index}
                        ix={ix}
                        message={message}
                        programName="Unknown Program"
                    />
                }
            >
                <AnchorDetailsCard
                    anchorProgram={anchorProgram.program}
                    index={index}
                    // Inner cards and child are not used since we do not know what CPIs
                    // will be called until simulation happens, and even then, all we
                    // get is logs, not the TransactionInstructions
                    innerCards={undefined}
                    ix={transactionInstruction}
                    // Always display success since it is too complicated to determine
                    // based on the simulation and pass that result here. Could be added
                    // later if desired, possibly similar to innerCards from parsing tx
                    // sim logs.
                    result={{ err: null }}
                    // Signature is not needed.
                    signature=""
                />
            </ErrorBoundary>
        );
    }

    /// Handle program-specific cards here
    //  - keep signature (empty string as we do not submit anything) for backward compatibility with the data from Transaction
    //  - result is `err: null` as at this point there should not be errors
    const result = { err: null };
    const signature = '';
    switch (transactionInstruction?.programId.toString()) {
        case ASSOCIATED_TOKEN_PROGRAM_ID.toString(): {
            // NOTE: current limitation is that innerInstructions won't be present at the AssociatedTokenDetailsCard. For that purpose we might need to simulateTransactions to get them.

            const asParsedInstruction = intoParsedInstruction(transactionInstruction);
            return (
                <AssociatedTokenDetailsCard
                    key={index}
                    ix={asParsedInstruction}
                    raw={ix}
                    message={message}
                    index={index}
                    result={result}
                />
            );
        }
        case ComputeBudgetProgram.programId.toString(): {
            return (
                <ComputeBudgetDetailsCard
                    key={index}
                    ix={transactionInstruction}
                    index={index}
                    result={result}
                    signature={signature}
                    InstructionCardComponent={BaseInstructionCard}
                />
            );
        }
        default: {
            // unknown program; allow to render the next card
        }
    }

    return <UnknownDetailsCard key={index} index={index} ix={ix} message={message} programName={programName} />;
}
