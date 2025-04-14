import {
    AccountMeta,
    MessageAddressTableLookup,
    MessageCompiledInstruction,
    PublicKey,
    TransactionInstruction,
    VersionedMessage,
    AddressLookupTableAccount,
} from '@solana/web3.js';

type LookupsForAccountKeyIndex = { lookupTableIndex: number; lookupTableKey: PublicKey };

function findLookupAddressByIndex(
    accountIndex: number,
    message: VersionedMessage,
    lookupsForAccountKeyIndex: LookupsForAccountKeyIndex[],
    lookupTableAccounts?: AddressLookupTableAccount[]
) {
    let lookup: PublicKey;
    // dynamic means that lookups are taken based not on staticAccountKeys
    let dynamicLookups:
        | { isStatic: true; lookups: undefined }
        | { isStatic: false; lookups: LookupsForAccountKeyIndex };

    console.log(4561, accountIndex, message.staticAccountKeys.length, lookupsForAccountKeyIndex);
    if (accountIndex >= message.staticAccountKeys.length) {
        const lookupIndex = accountIndex - message.staticAccountKeys.length;

        // If we have lookup table accounts available, try to resolve from them first
        if (lookupTableAccounts && lookupTableAccounts.length > 0) {
            // Get lookup table and index
            const lookupTableData = lookupsForAccountKeyIndex[lookupIndex];

            // Find the matching lookup table account
            const matchingLookupTable = lookupTableAccounts.find(lt =>
                lt.key.equals(lookupTableData.lookupTableKey));

            if (matchingLookupTable &&
                lookupTableData.lookupTableIndex < matchingLookupTable.state.addresses.length) {
                // Use the actual address from the lookup table
                lookup = matchingLookupTable.state.addresses[lookupTableData.lookupTableIndex];
            } else {
                // Fall back to lookup table key if we can't find the actual address
                lookup = lookupsForAccountKeyIndex[lookupIndex].lookupTableKey;
            }
        } else {
            lookup = lookupsForAccountKeyIndex[lookupIndex].lookupTableKey;
        }

        dynamicLookups = {
            isStatic: false,
            lookups: lookupsForAccountKeyIndex[lookupIndex],
        };
    } else {
        lookup = message.staticAccountKeys[accountIndex];
        dynamicLookups = {
            isStatic: true,
            lookups: undefined,
        };
    }

    if (lookup && lookup.equals(new PublicKey('2YZvo6LkePK8V2G2ZaS8UxBYX2Ph6udCu5iuaYAqVM38'))) {
        // lookup = new PublicKey('2YZvo6LkePK8V2G2ZaS8UxBYX2Ph6udCu5iuaYAqVM38');

        console.log(456, lookup.toString(), accountIndex, message.staticAccountKeys.length);
    }

    return { dynamicLookups, lookup };
}

function fillAccountMetas(
    accountKeyIndexes: number[],
    message: VersionedMessage,
    lookupsForAccountKeyIndex: LookupsForAccountKeyIndex[],
    lookupTableAccounts?: AddressLookupTableAccount[]
) {
    const accountMetas = accountKeyIndexes.map(accountIndex => {
        const { lookup } = findLookupAddressByIndex(accountIndex, message, lookupsForAccountKeyIndex, lookupTableAccounts);

        const isSigner = accountIndex < message.header.numRequiredSignatures;
        const isWritable = message.isAccountWritable(accountIndex);
        const accountMeta: AccountMeta = {
            isSigner,
            isWritable,
            pubkey: lookup,
        };

        return accountMeta;
    });

    return accountMetas;
}

export function findLookupAddress(
    accountIndex: number,
    message: VersionedMessage,
    lookupsForAccountKeyIndex: LookupsForAccountKeyIndex[],
    lookupTableAccounts?: AddressLookupTableAccount[]
) {
    return findLookupAddressByIndex(accountIndex, message, lookupsForAccountKeyIndex, lookupTableAccounts);
}

export function fillAddressTableLookupsAccounts(addressTableLookups: MessageAddressTableLookup[]) {
    const lookupsForAccountKeyIndex: LookupsForAccountKeyIndex[] = [
        ...addressTableLookups.flatMap(lookup =>
            lookup.writableIndexes.map(index => ({
                lookupTableIndex: index,
                lookupTableKey: lookup.accountKey,
            }))
        ),
        ...addressTableLookups.flatMap(lookup =>
            lookup.readonlyIndexes.map(index => ({
                lookupTableIndex: index,
                lookupTableKey: lookup.accountKey,
            }))
        ),
    ];

    return lookupsForAccountKeyIndex;
}

export function intoTransactionInstructionFromVersionedMessage(
    compiledInstruction: MessageCompiledInstruction,
    originalMessage: VersionedMessage,
    lookupTableAccounts?: AddressLookupTableAccount[]
): TransactionInstruction {
    const { accountKeyIndexes, data } = compiledInstruction;
    const { addressTableLookups } = originalMessage;

    const lookupAccounts = fillAddressTableLookupsAccounts(addressTableLookups);
    console.log(123, { addressTableLookups });
    console.log(123, { lookupAccounts });

    // When we're deserializing Squads vault transactions, an "outer" programIdIndex can be found in the addressTableLookups
    // (You never need to lookup outer programIds for normal messages)
    let programId: PublicKey | undefined;
    if (compiledInstruction.programIdIndex < originalMessage.staticAccountKeys.length) {
        programId = originalMessage.staticAccountKeys.at(compiledInstruction.programIdIndex);
    } else {
        // This is only needed for Squads vault transactions, in normal messages, outer program IDs cannot be in addressTableLookups
        const lookupIndex = compiledInstruction.programIdIndex - originalMessage.staticAccountKeys.length;

        // Try to resolve program ID from lookup table accounts if available
        if (lookupTableAccounts && lookupTableAccounts.length > 0) {
            const lookupTableKey = addressTableLookups[lookupIndex].accountKey;
            const matchingLookupTable = lookupTableAccounts.find(lt => lt.key.equals(lookupTableKey));

            if (matchingLookupTable) {
                // For program ID, we need to check both readable and writable indexes
                const tableIndex = [...addressTableLookups[lookupIndex].writableIndexes,
                                     ...addressTableLookups[lookupIndex].readonlyIndexes][0];

                if (tableIndex < matchingLookupTable.state.addresses.length) {
                    programId = matchingLookupTable.state.addresses[tableIndex];
                } else {
                    programId = addressTableLookups[lookupIndex].accountKey;
                }
            } else {
                programId = addressTableLookups[lookupIndex].accountKey;
            }
        } else {
            programId = addressTableLookups[lookupIndex].accountKey;
        }
    }
    if (!programId) throw new Error('Program ID not found');

    const accountMetas = fillAccountMetas(accountKeyIndexes, originalMessage, lookupAccounts, lookupTableAccounts);

    const transactionInstruction: TransactionInstruction = new TransactionInstruction({
        data: Buffer.from(data),
        keys: accountMetas,
        programId: programId,
    });

    return transactionInstruction;
}
