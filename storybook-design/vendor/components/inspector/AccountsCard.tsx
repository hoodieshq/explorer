/* eslint-disable unicorn/no-null -- vendored copy of app/components/inspector/AccountsCard.tsx; the upstream path is exempted
   from these rules by the TODO allowlists in eslint.config.mjs, which only match app/**. */
import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { ErrorCard } from '@components/common/ErrorCard';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';
import { type AccountInfo, useAccountsInfo } from '@entities/account';
import { useAccountInfo, useAddressLookupTable, useFetchAccountInfo } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { type PublicKey, type VersionedMessage } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import React, { useMemo } from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { toHex } from '@/app/shared/lib/bytes';

import { Section } from '../../shared/ui/Section';
import { AddressFromLookupTableWithContext } from './AddressWithContext';

// Desktop-only grid (lg+): a single 5-column row driven by the header labels. Below lg the row uses
// the Tokens-block mobile layout instead (see AccountRowLayout).
const ROW_GRID_DESKTOP = cn(
    'hidden min-h-9 px-3 py-2.5 md:px-4 lg:grid',
    'items-start gap-x-5 whitespace-nowrap text-sm',
    "[grid-template-areas:'number_address_owned_balance_size']",
    'grid-cols-[minmax(auto,1.25rem)_1fr_minmax(auto,180px)_minmax(auto,160px)_minmax(auto,110px)]',
);

// Fixed-width per-row field label for the mobile layout — copied verbatim from the Tokens block so
// the two lists read identically (fixed label column, left-aligned values, plain — not uppercase).
const MOBILE_LABEL = 'w-16 shrink-0 text-outer-space-300';

// Header row (lg+ only), matching the Tokens-block header padding/typography.
const HEADER_GRID = cn(
    'hidden px-3 py-1.5 md:px-4 lg:grid',
    'grid-cols-[minmax(auto,1.25rem)_1fr_minmax(auto,180px)_minmax(auto,160px)_minmax(auto,110px)] gap-5',
    'text-xs uppercase text-outer-space-300',
    'border-1 border-b border-white/10 [border-bottom-style:solid]',
);

export function AccountsCard({ message }: { message: VersionedMessage }) {
    const { url } = useCluster();

    const pubkeys = useMemo(() => message.staticAccountKeys, [message.staticAccountKeys]);
    const { accounts, error: fetchError, loading } = useAccountsInfo(pubkeys, url);

    const { validMessage, error } = React.useMemo(() => {
        const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = message.header;

        if (numReadonlySignedAccounts >= numRequiredSignatures) {
            return { error: 'Invalid header', validMessage: undefined };
        } else if (numReadonlyUnsignedAccounts >= message.staticAccountKeys.length) {
            return { error: 'Invalid header', validMessage: undefined };
        } else if (message.staticAccountKeys.length === 0) {
            return { error: 'Message has no accounts', validMessage: undefined };
        }

        return {
            error: undefined,
            validMessage: message,
        };
    }, [message]);

    const { accountRows, numAccounts } = React.useMemo(() => {
        const message = validMessage;
        if (!message) return { accountRows: undefined, numAccounts: 0 };
        const staticAccountRows = message.staticAccountKeys.map((publicKey, accountIndex) => {
            const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = message.header;

            let readOnly = false;
            let signer = false;
            if (accountIndex < numRequiredSignatures) {
                signer = true;
                if (accountIndex >= numRequiredSignatures - numReadonlySignedAccounts) {
                    readOnly = true;
                }
            } else if (accountIndex >= message.staticAccountKeys.length - numReadonlyUnsignedAccounts) {
                readOnly = true;
            }

            const props = {
                accountIndex,
                accountInfo: accounts.get(publicKey.toBase58()),
                loading,
                publicKey,
                readOnly,
                signer,
            };

            return <AccountRow key={accountIndex} {...props} />;
        });

        let accountIndex = message.staticAccountKeys.length;
        const writableLookupTableRows = message.addressTableLookups.flatMap(lookup => {
            return lookup.writableIndexes.map(lookupTableIndex => {
                const props = {
                    accountIndex,
                    lookupTableIndex,
                    lookupTableKey: lookup.accountKey,
                    readOnly: false,
                };

                accountIndex += 1;
                return <AccountFromLookupTableRow key={accountIndex} {...props} />;
            });
        });

        const readonlyLookupTableRows = message.addressTableLookups.flatMap(lookup => {
            return lookup.readonlyIndexes.map(lookupTableIndex => {
                const props = {
                    accountIndex,
                    lookupTableIndex,
                    lookupTableKey: lookup.accountKey,
                    readOnly: true,
                };

                accountIndex += 1;
                return <AccountFromLookupTableRow key={accountIndex} {...props} />;
            });
        });

        return {
            accountRows: [...staticAccountRows, ...writableLookupTableRows, ...readonlyLookupTableRows],
            numAccounts: accountIndex,
        };
    }, [accounts, loading, validMessage]);

    const totalAccountSize = React.useMemo(
        () => Array.from(accounts.values()).reduce((acc, account) => acc + account.size, 0),
        [accounts],
    );

    if (fetchError) {
        return (
            <Section title="Account List" className="">
                <ErrorCard text="Failed to fetch accounts info" />
            </Section>
        );
    }

    if (error) {
        return <ErrorCard text={`Unable to display accounts. ${error}`} />;
    }

    return (
        <Section title={`Account List ${numAccounts}`}>
            <div className={HEADER_GRID}>
                <div>#</div>
                <div>Address</div>
                <div>Owner</div>
                <div className="text-right">Post Balance (SOL)</div>
                <div className="text-right">Size</div>
            </div>
            {accountRows}
            {!loading && totalAccountSize > 0 && (
                <div className="flex items-baseline gap-2 px-3 py-2 text-sm text-outer-space-300 lg:ml-10">
                    <div className="flex flex-col">
                        <span className="text-sm uppercase leading-none">Total Account Size:</span>
                        <span className="text-[10px] leading-none">reflects current state</span>
                    </div>
                    <span className="text-white">{totalAccountSize.toLocaleString('en-US')} bytes</span>
                </div>
            )}
        </Section>
    );
}

function AccountRow({
    accountIndex,
    accountInfo,
    loading,
    publicKey,
    signer,
    readOnly,
}: {
    accountIndex: number;
    accountInfo: AccountInfo | undefined;
    loading: boolean;
    publicKey: PublicKey;
    signer: boolean;
    readOnly: boolean;
}) {
    return (
        <AccountRowLayout
            index={accountIndex}
            pubkey={publicKey}
            addressSlot={<Address pubkey={publicKey} link />}
            badges={
                <>
                    {signer && (
                        <Badge ui="dashkit" variant="info">
                            Signer
                        </Badge>
                    )}
                    {!readOnly && (
                        <Badge ui="dashkit" variant="destructive">
                            Writable
                        </Badge>
                    )}
                </>
            }
            sizeSlot={<AccountDataSize accountInfo={accountInfo} loading={loading} />}
        />
    );
}

function AccountFromLookupTableRow({
    accountIndex,
    lookupTableKey,
    lookupTableIndex,
    readOnly,
}: {
    accountIndex: number;
    lookupTableKey: PublicKey;
    lookupTableIndex: number;
    readOnly: boolean;
}) {
    const lookupTableInfo = useAddressLookupTable(lookupTableKey.toBase58());
    const lookupTable = lookupTableInfo && lookupTableInfo[0];
    const pubkey =
        lookupTable && typeof lookupTable !== 'string' && lookupTableIndex < lookupTable.state.addresses.length
            ? lookupTable.state.addresses[lookupTableIndex]
            : undefined;

    return (
        <AccountRowLayout
            index={accountIndex}
            pubkey={pubkey}
            addressSlot={
                <AddressFromLookupTableWithContext
                    lookupTableKey={lookupTableKey}
                    lookupTableIndex={lookupTableIndex}
                    hideInfo
                />
            }
            badges={
                <>
                    {!readOnly && (
                        <Badge ui="dashkit" variant="destructive">
                            Writable
                        </Badge>
                    )}
                    <Badge ui="dashkit" variant="gray">
                        Address Table Lookup
                    </Badge>
                </>
            }
        />
    );
}

// Shared presentational row mirroring the transaction-page Accounts grid. Reads the on-chain
// account state (owner + balance) from the accounts provider; `sizeSlot` supplies the interactive
// size element (see AccountDataSize) and falls back to the provider-reported space when omitted.
function AccountRowLayout({
    index,
    pubkey,
    addressSlot,
    badges,
    sizeSlot,
}: {
    index: number;
    pubkey?: PublicKey;
    addressSlot: React.ReactNode;
    badges?: React.ReactNode;
    sizeSlot?: React.ReactNode;
}) {
    const { account } = useInspectorAccountInfo(pubkey);

    let ownedNode: React.ReactNode = null;
    let balanceNode: React.ReactNode = null;
    let sizeNode: React.ReactNode = sizeSlot;

    if (!account) {
        ownedNode = (
            <span className="text-outer-space-300">
                <span className="spinner-grow spinner-grow-sm mr-1.5"></span>
                Loading
            </span>
        );
    } else if (account.lamports === 0) {
        ownedNode = <span className="text-outer-space-300">Account doesn&apos;t exist</span>;
    } else {
        // Render the owner as a fully-resolved, linked address (label lookup + truncation happen
        // inside <Address/>), so it works for any owner, not just well-known programs.
        ownedNode = <Address pubkey={account.owner} link />;
        balanceNode = <SolBalance lamports={account.lamports} />;
        if (sizeNode == undefined && account.space !== undefined) {
            sizeNode = (
                <span className="text-outer-space-300">
                    {new Intl.NumberFormat('en-US').format(account.space)} bytes
                </span>
            );
        }
    }

    return (
        <div className="border-1 border-b border-white/10 [border-bottom-style:solid] last:border-b-0">
            {/* Mobile layout (mirrors the Tokens block): fixed-width labels, left-aligned values,
                every row labelled, and the ordinal number top-right (no leading #). */}
            <div className="flex flex-col gap-1 px-3 py-3 text-sm md:px-4 lg:hidden">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                        <span className={MOBILE_LABEL}>Address</span>
                        <div className="min-w-0">
                            {addressSlot}
                            {/* Badge line collapses (incl. its top margin) when a row has no tags. */}
                            <span className="mt-1 flex flex-wrap items-center gap-1 empty:hidden">{badges}</span>
                        </div>
                    </div>
                    <span className="shrink-0 text-outer-space-300">{index + 1}</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className={MOBILE_LABEL}>Owner</span>
                    <span className="min-w-0">{ownedNode}</span>
                </div>
                {balanceNode && (
                    <div className="flex items-start gap-2">
                        <span className={MOBILE_LABEL}>Balance</span>
                        <span className="min-w-0">{balanceNode}</span>
                    </div>
                )}
                {sizeNode && (
                    <div className="flex items-start gap-2">
                        <span className={MOBILE_LABEL}>Size</span>
                        <span className="min-w-0">{sizeNode}</span>
                    </div>
                )}
            </div>

            {/* Desktop layout (lg+): 5-column grid driven by the header. */}
            <div className={ROW_GRID_DESKTOP}>
                <div className="text-outer-space-300 [grid-area:number]">{index + 1}</div>
                <div className="min-w-0 [grid-area:address]">
                    {addressSlot}
                    <span className="mt-1 flex flex-wrap items-center gap-1 empty:hidden">{badges}</span>
                </div>
                <div className="justify-self-start [grid-area:owned]">{ownedNode}</div>
                <div className="justify-self-end [grid-area:balance]">{balanceNode}</div>
                <div className="justify-self-end [grid-area:size]">{sizeNode}</div>
            </div>
        </div>
    );
}

// The interactive size element: clicking copies the raw account data (hex).
function AccountDataSize({ accountInfo, loading }: { accountInfo: AccountInfo | undefined; loading: boolean }) {
    if (loading) return <span className="text-outer-space-300">Loading...</span>;
    if (!accountInfo) return null;

    return (
        <Copyable text={toHex(accountInfo.data)}>
            <span className="text-outer-space-300">{accountInfo.size.toLocaleString('en-US')} bytes</span>
        </Copyable>
    );
}

// Fetches on-chain account state (owner, balance, space) from the accounts provider, mirroring the
// fetch-on-load behaviour of AddressWithContext's AccountInfo.
function useInspectorAccountInfo(pubkey?: PublicKey) {
    const address = pubkey?.toBase58() ?? '';
    const fetchAccount = useFetchAccountInfo();
    const info = useAccountInfo(address);
    const { status } = useCluster();

    React.useEffect(() => {
        if (pubkey && !info && status === ClusterStatus.Connected) {
            fetchAccount(pubkey, 'skip');
        }
    }, [address, status]); // eslint-disable-line react-hooks/exhaustive-deps

    return { account: info?.data };
}
