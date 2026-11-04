import ScaledUiAmountMultiplierTooltip from '@components/account/token-extensions/ScaledUiAmountMultiplierTooltip';
import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { Timestamp } from '@components/shared/ui/timestamp';
import { useRefreshAccount } from '@entities/account';
import { isMetaplexNFT } from '@entities/nft';
import { AccountCard } from '@features/account';
import { isSome } from '@metaplex-foundation/umi';
import { Account, NFTData } from '@providers/accounts';
import { TOKEN_2022_PROGRAM_ID, useScaledUiAmountForMint } from '@providers/accounts/tokens';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { normalizeTokenAmount } from '@utils/index';
import { getCurrentTokenScaledUiAmountMultiplier } from '@utils/token-info';
import { addressLabel } from '@utils/tx';
import { MintAccountInfo, MultisigAccountInfo, TokenAccount, TokenAccountInfo } from '@validators/accounts/token';
import {
    ConfidentialTransferAccount,
    ConfidentialTransferFeeAmount,
    ConfidentialTransferFeeConfig,
    ConfidentialTransferMint,
    CpiGuard,
    DefaultAccountState,
    GroupMemberPointer,
    GroupPointer,
    InterestBearingConfig,
    MemoTransfer,
    MetadataPointer,
    MintCloseAuthority,
    PausableConfig,
    PermanentDelegate,
    PermissionedBurnConfig,
    ScaledUiAmountConfig,
    TokenExtension,
    TokenExtensionType,
    TokenGroup,
    TokenGroupMember,
    TokenMetadata,
    TransferFeeAmount,
    TransferFeeConfig,
    TransferHook,
    TransferHookAccount,
} from '@validators/accounts/token-extension';
import { BigNumber } from 'bignumber.js';
import { capitalCase } from 'change-case';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'react-feather';
import { create } from 'superstruct';
import useSWR from 'swr';

import { Badge } from '@/app/components/shared/ui/badge';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { invariant } from '@/app/shared/lib/invariant';
import { Logger } from '@/app/shared/lib/logger';
import { getSafeExternalHref } from '@/app/shared/lib/url';
import { KeyValue, type KeyValueRow, type KeyValueRowInput, KeyValueRows } from '@/app/shared/ui/key-value';
import { FullTokenInfo, getTokenInfo, getTokenInfoSwrKey } from '@/app/utils/token-info';

import { ExtensionField, ExtensionFieldGroup } from './token-extensions/ExtensionField';
import { TokenExtensionsStatusRow } from './token-extensions/TokenExtensionsStatusRow';
import { UnknownAccountCard } from './UnknownAccountCard';

const getEthAddress = (link?: string) => {
    let address = '';
    if (link) {
        // eslint-disable-next-line no-restricted-syntax -- extract Ethereum address from URL
        const extractEth = link.match(/0x[a-fA-F0-9]{40,64}/);

        if (extractEth) {
            address = extractEth[0];
        }
    }

    return address;
};

export const StatusBadge = ({ status }: { status: string }) => (
    <Badge ui="dashkit" variant={status === 'initialized' ? 'success' : 'warning'}>
        {capitalCase(status)}
    </Badge>
);

export function TokenAccountSection({
    account,
    tokenAccount,
    tokenInfo,
}: {
    account: Account;
    tokenAccount: TokenAccount;
    tokenInfo?: FullTokenInfo;
}) {
    const { cluster } = useCluster();

    try {
        switch (tokenAccount.type) {
            case 'mint': {
                const mintInfo = create(tokenAccount.info, MintAccountInfo);

                const parsedData = account.data.parsed;
                if (isMetaplexNFT(parsedData, mintInfo)) {
                    invariant(parsedData.nftData, 'isMetaplexNFT returned true but nftData is missing');
                    return (
                        <NonFungibleTokenMintAccountCard
                            account={account}
                            nftData={parsedData.nftData}
                            mintInfo={mintInfo}
                        />
                    );
                }

                return <FungibleTokenMintAccountCard account={account} mintInfo={mintInfo} tokenInfo={tokenInfo} />;
            }
            case 'account': {
                const info = create(tokenAccount.info, TokenAccountInfo);
                return <TokenAccountCard account={account} info={info} />;
            }
            case 'multisig': {
                const info = create(tokenAccount.info, MultisigAccountInfo);
                return <MultisigAccountCard account={account} info={info} />;
            }
        }
    } catch (err) {
        if (cluster !== Cluster.Custom) {
            Logger.error(err, {
                address: account.pubkey.toBase58(),
            });
        }
    }
    return <UnknownAccountCard account={account} />;
}

function FungibleTokenMintAccountCard({
    account,
    mintInfo,
    tokenInfo,
}: {
    account: Account;
    mintInfo: MintAccountInfo;
    tokenInfo?: FullTokenInfo;
}) {
    const fetchInfo = useRefreshAccount();

    const bridgeContractAddress = getEthAddress(tokenInfo?.extensions?.bridgeContract);
    const assetContractAddress = getEthAddress(tokenInfo?.extensions?.assetContract);

    const mintExtensions = mintInfo.extensions?.slice();
    mintExtensions?.sort(cmpExtension);
    const scaledUiAmountMultiplier = getCurrentTokenScaledUiAmountMultiplier(mintExtensions);

    const rows: KeyValueRowInput[] = [
        { label: 'Address', value: <Address pubkey={account.pubkey} raw /> },
        {
            label: mintInfo.mintAuthority === null ? 'Fixed Supply' : 'Current Supply',
            value: (
                <>
                    <span>
                        {normalizeTokenAmount(
                            Number(mintInfo.supply) * Number(scaledUiAmountMultiplier),
                            mintInfo.decimals,
                        ).toLocaleString('en-US', {
                            maximumFractionDigits: 20,
                        })}
                    </span>
                    <ScaledUiAmountMultiplierTooltip
                        rawAmount={normalizeTokenAmount(Number(mintInfo.supply), mintInfo.decimals).toString()}
                        scaledUiAmountMultiplier={scaledUiAmountMultiplier}
                    />
                </>
            ),
        },
        tokenInfo?.extensions?.website && {
            label: 'Website',
            value: (
                <ExternalLink href={tokenInfo.extensions.website}>
                    {tokenInfo.extensions.website}
                    <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
                </ExternalLink>
            ),
        },
        mintInfo.mintAuthority && {
            label: 'Mint Authority',
            value: <Address pubkey={mintInfo.mintAuthority} link />,
        },
        mintInfo.freezeAuthority && {
            label: 'Freeze Authority',
            value: <Address pubkey={mintInfo.freezeAuthority} link />,
        },
        { label: 'Decimals', value: mintInfo.decimals },
        !mintInfo.isInitialized && { label: 'Status', value: 'Uninitialized' },
        tokenInfo?.extensions?.bridgeContract &&
            bridgeContractAddress && {
                label: 'Bridge Contract',
                value: (
                    <Copyable text={bridgeContractAddress}>
                        <ExternalLink href={tokenInfo.extensions.bridgeContract}>{bridgeContractAddress}</ExternalLink>
                    </Copyable>
                ),
            },
        tokenInfo?.extensions?.assetContract &&
            assetContractAddress && {
                label: 'Bridged Asset Contract',
                value: (
                    <Copyable text={assetContractAddress}>
                        <ExternalLink href={tokenInfo.extensions.assetContract}>{assetContractAddress}</ExternalLink>
                    </Copyable>
                ),
            },
    ];

    return (
        <AccountCard
            title={
                tokenInfo
                    ? 'Overview'
                    : account.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()
                      ? 'Token-2022 Mint'
                      : 'Token Mint'
            }
            account={account}
            refresh={() => fetchInfo(account.pubkey, 'parsed')}
            analyticsSection="token_mint_card"
        >
            <KeyValueRows rows={rows} />
            {mintExtensions && (
                <TokenExtensionsStatusRow address={account.pubkey.toBase58()} extensions={mintExtensions} />
            )}
        </AccountCard>
    );
}

function NonFungibleTokenMintAccountCard({
    account,
    nftData,
    mintInfo,
}: {
    account: Account;
    nftData: NFTData;
    mintInfo: MintAccountInfo;
}) {
    const fetchInfo = useRefreshAccount();

    const collectionOpt = nftData.metadata.collection;
    const collection = collectionOpt && isSome(collectionOpt) ? collectionOpt.value : null;
    const maxSupplyOpt =
        nftData.editionInfo.masterEdition && 'maxSupply' in nftData.editionInfo.masterEdition
            ? nftData.editionInfo.masterEdition.maxSupply
            : undefined;
    const maxSupply = maxSupplyOpt && isSome(maxSupplyOpt) ? Number(maxSupplyOpt.value) : null;

    const rows: KeyValueRowInput[] = [
        { label: 'Address', value: <Address pubkey={account.pubkey} raw /> },
        { label: 'Owner', value: <Address pubkey={account.owner} link /> },
        maxSupply != null && { label: 'Max Total Supply', value: maxSupply === 0 ? 1 : maxSupply },
        nftData?.editionInfo.masterEdition != null && {
            label: 'Current Supply',
            value:
                Number(nftData.editionInfo.masterEdition.supply) === 0
                    ? 1
                    : Number(nftData.editionInfo.masterEdition.supply),
        },
        collection?.verified && {
            label: 'Verified Collection Address',
            value: <Address pubkey={new PublicKey(collection.key.toString())} link />,
        },
        mintInfo.mintAuthority && {
            label: 'Mint Authority',
            value: <Address pubkey={mintInfo.mintAuthority} link />,
        },
        mintInfo.freezeAuthority && {
            label: 'Freeze Authority',
            value: <Address pubkey={mintInfo.freezeAuthority} link />,
        },
        {
            label: 'Update Authority',
            value: <Address pubkey={new PublicKey(nftData.metadata.updateAuthority.toString())} link />,
        },
        nftData?.json &&
            nftData.json.external_url && {
                label: 'Website',
                value: (
                    <ExternalLink href={nftData.json.external_url}>
                        {nftData.json.external_url}
                        <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
                    </ExternalLink>
                ),
            },
        nftData?.metadata && {
            label: 'Seller Fee',
            value: `${nftData.metadata.sellerFeeBasisPoints / 100}%`,
        },
    ];

    return (
        <AccountCard
            title="Overview"
            account={account}
            refresh={() => fetchInfo(account.pubkey, 'parsed')}
            analyticsSection="nft_mint_card"
        >
            <KeyValueRows rows={rows} />
        </AccountCard>
    );
}

async function fetchTokenInfo([_, address, cluster, url]: ['get-token-info', string, Cluster, string]) {
    return await getTokenInfo(new PublicKey(address), cluster, url);
}

function TokenAccountCard({ account, info }: { account: Account; info: TokenAccountInfo }) {
    const refresh = useRefreshAccount();
    const [_, scaledUiAmountMultiplier] = useScaledUiAmountForMint(info.mint.toBase58(), info.tokenAmount.amount);
    const { cluster, url } = useCluster();
    const label = addressLabel(account.pubkey.toBase58(), cluster);
    const swrKey = useMemo(() => getTokenInfoSwrKey(info.mint.toString(), cluster, url), [cluster, info.mint, url]);

    const { data: tokenInfo } = useSWR(swrKey, fetchTokenInfo);
    const [symbol, setSymbol] = useState<string | undefined>(undefined);
    const accountExtensions = info.extensions?.slice();
    accountExtensions?.sort(cmpExtension);

    const balance = info.isNative ? (
        <>
            {'\u25ce'}
            <span className="font-mono">{new BigNumber(info.tokenAmount.uiAmountString).toFormat(9)}</span>
        </>
    ) : (
        <>{info.tokenAmount.uiAmountString}</>
    );

    useEffect(() => {
        if (info.isNative) {
            setSymbol('SOL');
        } else {
            setSymbol(tokenInfo?.symbol);
        }
    }, [tokenInfo, info]);

    const rows: KeyValueRowInput[] = [
        { label: 'Address', value: <Address pubkey={account.pubkey} raw /> },
        label && { label: 'Address Label', value: label },
        { label: 'Mint', value: <Address pubkey={info.mint} link tokenLabelInfo={tokenInfo} /> },
        { label: 'Owner', value: <Address pubkey={info.owner} link /> },
        {
            label: <>Token balance {typeof symbol === 'string' && `(${symbol})`}</>,
            value: (
                <>
                    {balance}
                    <ScaledUiAmountMultiplierTooltip
                        rawAmount={normalizeTokenAmount(
                            Number(info.tokenAmount.amount),
                            info.tokenAmount.decimals || 0,
                        ).toString()}
                        scaledUiAmountMultiplier={scaledUiAmountMultiplier}
                    />
                </>
            ),
        },
        { label: 'Status', value: <StatusBadge status={info.state} /> },
        info.rentExemptReserve && {
            label: 'Rent-exempt reserve (SOL)',
            value: (
                <span className="font-mono">◎{new BigNumber(info.rentExemptReserve.uiAmountString).toFormat(9)}</span>
            ),
        },
        info.delegate && {
            label: 'Delegate',
            value: <Address pubkey={info.delegate} link />,
        },
        info.delegate && {
            label: <>Delegated amount {typeof symbol === 'string' && `(${symbol})`}</>,
            value: info.isNative ? (
                <>
                    {'\u25ce'}
                    <span className="font-mono">
                        {new BigNumber(info.delegatedAmount ? info.delegatedAmount.uiAmountString : '0').toFormat(9)}
                    </span>
                </>
            ) : (
                <>{info.delegatedAmount ? info.delegatedAmount.uiAmountString : '0'}</>
            ),
        },
    ];

    return (
        <AccountCard
            title={<>Token{account.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58() && '-2022'} Account</>}
            account={account}
            analyticsSection="token_account_card"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <KeyValueRows rows={rows} />
            {accountExtensions && (
                <TokenExtensionsStatusRow address={account.pubkey.toBase58()} extensions={accountExtensions} />
            )}
        </AccountCard>
    );
}

function MultisigAccountCard({ account, info }: { account: Account; info: MultisigAccountInfo }) {
    const refresh = useRefreshAccount();

    const headerRows: KeyValueRow[] = [
        { label: 'Address', value: <Address pubkey={account.pubkey} raw /> },
        { label: 'Required Signers', value: info.numRequiredSigners },
        { label: 'Valid Signers', value: info.numValidSigners },
    ];

    return (
        <AccountCard
            title="Multisig Account"
            account={account}
            analyticsSection="multisig_account_card"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <KeyValueRows rows={headerRows} />
            {info.signers.map(signer => (
                <KeyValue key={signer.toString()} label="Signer">
                    <Address pubkey={signer} link />
                </KeyValue>
            ))}
            {!info.isInitialized && <KeyValue label="Status">Uninitialized</KeyValue>}
        </AccountCard>
    );
}

function cmpExtension(a: TokenExtension, b: TokenExtension) {
    // be sure that extensions with a header row always come later
    const sortedExtensionTypes: TokenExtensionType[] = [
        'transferFeeAmount',
        'mintCloseAuthority',
        'defaultAccountState',
        'immutableOwner',
        'memoTransfer',
        'nonTransferable',
        'nonTransferableAccount',
        'cpiGuard',
        'pausableAccount',
        'permanentDelegate',
        'permissionedBurnConfig',
        'transferHook',
        'transferHookAccount',
        'metadataPointer',
        'groupPointer',
        'groupMemberPointer',
        // everything below this comment includes a header row
        'confidentialTransferAccount',
        'confidentialTransferFeeConfig',
        'confidentialTransferFeeAmount',
        'confidentialTransferMint',
        'interestBearingConfig',
        'pausableConfig',
        'scaledUiAmountConfig',
        'transferFeeConfig',
        'tokenGroup',
        'tokenGroupMember',
        'tokenMetadata',
        // always keep this last
        'unparseableExtension',
    ];
    return sortedExtensionTypes.indexOf(a.extension) - sortedExtensionTypes.indexOf(b.extension);
}

function HHeader({ name }: { name: string }) {
    return <div className="pb-1 pt-3 text-[15px] text-white">{name}</div>;
}

/* Do not move component to keep commit history.
    NOTE: Needs to be separated at closest refactoring
    Also check whether it is needed to keep it as function and not a proper React component
*/
export function TokenExtensionRow(
    tokenExtension: TokenExtension,
    maybeEpoch: bigint | undefined,
    decimals: number,
    symbol: string | undefined,
    headerStyle: 'header' | 'omit' = 'header',
) {
    const epoch = maybeEpoch || 0n; // fallback to 0 if not provided
    switch (tokenExtension.extension) {
        case 'mintCloseAuthority': {
            const extension = create(tokenExtension.state, MintCloseAuthority);
            if (extension.closeAuthority) {
                return (
                    <ExtensionField label="Close Authority">
                        <Address pubkey={extension.closeAuthority} link />
                    </ExtensionField>
                );
            } else {
                return <></>;
            }
        }
        case 'transferFeeAmount': {
            const extension = create(tokenExtension.state, TransferFeeAmount);
            return (
                <ExtensionField label={<>Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</>}>
                    {normalizeTokenAmount(extension.withheldAmount, decimals).toLocaleString('en-US', {
                        maximumFractionDigits: 20,
                    })}
                </ExtensionField>
            );
        }
        case 'transferFeeConfig': {
            const extension = create(tokenExtension.state, TransferFeeConfig);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Transfer Fee Config" /> : null}
                    {extension.transferFeeConfigAuthority && (
                        <ExtensionField label="Transfer Fee Authority">
                            <Address pubkey={extension.transferFeeConfigAuthority} link />
                        </ExtensionField>
                    )}
                    <ExtensionField
                        label={<>{extension.newerTransferFee.epoch > epoch ? 'Current' : 'Previous'} Fee Epoch</>}
                    >
                        {extension.olderTransferFee.epoch}
                    </ExtensionField>
                    <ExtensionField
                        label={
                            <>
                                {extension.newerTransferFee.epoch > epoch ? 'Current' : 'Previous'} Maximum Fee{' '}
                                {typeof symbol === 'string' && `(${symbol})`}
                            </>
                        }
                    >
                        {normalizeTokenAmount(extension.olderTransferFee.maximumFee, decimals).toLocaleString('en-US', {
                            maximumFractionDigits: 20,
                        })}
                    </ExtensionField>
                    <ExtensionField
                        label={<>{extension.newerTransferFee.epoch > epoch ? 'Current' : 'Previous'} Fee Rate</>}
                    >{`${extension.olderTransferFee.transferFeeBasisPoints / 100}%`}</ExtensionField>
                    <ExtensionField
                        label={<>{extension.newerTransferFee.epoch > epoch ? 'Future' : 'Current'} Fee Epoch</>}
                    >
                        {extension.newerTransferFee.epoch}
                    </ExtensionField>
                    <ExtensionField
                        label={
                            <>
                                {extension.newerTransferFee.epoch > epoch ? 'Future' : 'Current'} Maximum Fee{' '}
                                {typeof symbol === 'string' && `(${symbol})`}
                            </>
                        }
                    >
                        {normalizeTokenAmount(extension.newerTransferFee.maximumFee, decimals).toLocaleString('en-US', {
                            maximumFractionDigits: 20,
                        })}
                    </ExtensionField>
                    <ExtensionField
                        label={<>{extension.newerTransferFee.epoch > epoch ? 'Future' : 'Current'} Fee Rate</>}
                    >{`${extension.newerTransferFee.transferFeeBasisPoints / 100}%`}</ExtensionField>
                    {extension.withdrawWithheldAuthority && (
                        <ExtensionField label="Withdraw Withheld Fees Authority">
                            <Address pubkey={extension.withdrawWithheldAuthority} link />
                        </ExtensionField>
                    )}
                    <ExtensionField label={<>Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</>}>
                        {normalizeTokenAmount(extension.withheldAmount, decimals).toLocaleString('en-US', {
                            maximumFractionDigits: 20,
                        })}
                    </ExtensionField>
                </>
            );
        }
        case 'confidentialTransferMint': {
            const extension = create(tokenExtension.state, ConfidentialTransferMint);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Confidential Transfer Mint" /> : null}
                    {extension.authority && (
                        <ExtensionField label="Authority">
                            <Address pubkey={extension.authority} link />
                        </ExtensionField>
                    )}
                    {extension.auditorElgamalPubkey && (
                        <ExtensionField label="Auditor Elgamal Pubkey">{extension.auditorElgamalPubkey}</ExtensionField>
                    )}
                    <ExtensionField label="New Account Approval Policy">
                        {extension.autoApproveNewAccounts ? 'auto' : 'manual'}
                    </ExtensionField>
                </>
            );
        }
        case 'confidentialTransferFeeConfig': {
            const extension = create(tokenExtension.state, ConfidentialTransferFeeConfig);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Confidential Transfer Fee" /> : null}
                    {extension.authority && (
                        <ExtensionField label="Authority">
                            <Address pubkey={extension.authority} link />
                        </ExtensionField>
                    )}
                    {extension.withdrawWithheldAuthorityElgamalPubkey && (
                        <ExtensionField label="Auditor Elgamal Pubkey">
                            {extension.withdrawWithheldAuthorityElgamalPubkey}
                        </ExtensionField>
                    )}
                    <ExtensionField label="Harvest to Mint">
                        {extension.harvestToMintEnabled ? 'enabled' : 'disabled'}
                    </ExtensionField>
                    <ExtensionField
                        label={<>Encrypted Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</>}
                    >
                        {extension.withheldAmount}
                    </ExtensionField>
                </>
            );
        }
        case 'defaultAccountState': {
            const extension = create(tokenExtension.state, DefaultAccountState);
            return <ExtensionField label="DefaultAccountState">{extension.accountState}</ExtensionField>;
        }
        case 'nonTransferable': {
            return <ExtensionField label="Non-Transferable">enabled</ExtensionField>;
        }
        case 'interestBearingConfig': {
            const extension = create(tokenExtension.state, InterestBearingConfig);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Interest-Bearing" /> : null}
                    {extension.rateAuthority && (
                        <ExtensionField label="Authority">
                            <Address pubkey={extension.rateAuthority} link />
                        </ExtensionField>
                    )}
                    <ExtensionField label="Current Rate">{`${extension.currentRate / 100}%`}</ExtensionField>
                    <ExtensionField label="Pre-Current Average Rate">{`${extension.preUpdateAverageRate / 100}%`}</ExtensionField>
                    <ExtensionField label="Last Update Timestamp">
                        <Timestamp unixTimestamp={extension.lastUpdateTimestamp} />
                    </ExtensionField>
                    <ExtensionField label="Initialization Timestamp">
                        <Timestamp unixTimestamp={extension.initializationTimestamp} />
                    </ExtensionField>
                </>
            );
        }
        case 'scaledUiAmountConfig': {
            const extension = create(tokenExtension.state, ScaledUiAmountConfig);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Scaled UI Amount Config" /> : null}
                    {extension.authority && (
                        <ExtensionField label="Authority">
                            <Address pubkey={extension.authority} link />
                        </ExtensionField>
                    )}
                    <ExtensionField label="Multiplier">{extension.multiplier}</ExtensionField>
                    <ExtensionField label="New Multiplier">{extension.newMultiplier}</ExtensionField>
                    <ExtensionField label="New Multiplier Effective Timestamp">
                        <Timestamp unixTimestamp={extension.newMultiplierEffectiveTimestamp} />
                    </ExtensionField>
                </>
            );
        }
        case 'pausableAccount': {
            return <ExtensionField label="Pausable Account">enabled</ExtensionField>;
        }
        case 'pausableConfig': {
            const extension = create(tokenExtension.state, PausableConfig);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Pausable Config" /> : null}
                    <>
                        {extension.authority && (
                            <ExtensionField label="Authority">
                                <Address pubkey={extension.authority} link />
                            </ExtensionField>
                        )}
                        <ExtensionField label="Paused">{extension.paused ? 'paused' : 'not paused'}</ExtensionField>
                    </>
                </>
            );
        }
        case 'permissionedBurnConfig': {
            const extension = create(tokenExtension.state, PermissionedBurnConfig);
            if (extension.authority) {
                return (
                    <ExtensionField label="Permissioned Burn Authority">
                        <Address pubkey={extension.authority} link />
                    </ExtensionField>
                );
            } else {
                return <></>;
            }
        }
        case 'permanentDelegate': {
            const extension = create(tokenExtension.state, PermanentDelegate);
            if (extension.delegate) {
                return (
                    <ExtensionField label="Permanent Delegate">
                        <Address pubkey={extension.delegate} link />
                    </ExtensionField>
                );
            } else {
                return <></>;
            }
        }
        case 'transferHook': {
            const extension = create(tokenExtension.state, TransferHook);
            return (
                <>
                    {extension.programId && (
                        <ExtensionField label="Transfer Hook Program Id">
                            <Address pubkey={extension.programId} link />
                        </ExtensionField>
                    )}
                    {extension.authority && (
                        <ExtensionField label="Transfer Hook Authority">
                            <Address pubkey={extension.authority} link />
                        </ExtensionField>
                    )}
                </>
            );
        }
        case 'metadataPointer': {
            const extension = create(tokenExtension.state, MetadataPointer);
            return (
                <>
                    {extension.metadataAddress && (
                        <ExtensionField label="Metadata">
                            <Address pubkey={extension.metadataAddress} link />
                        </ExtensionField>
                    )}
                    {extension.authority && (
                        <ExtensionField label="Metadata Pointer Authority">
                            <Address pubkey={extension.authority} link />
                        </ExtensionField>
                    )}
                </>
            );
        }
        case 'groupPointer': {
            const extension = create(tokenExtension.state, GroupPointer);
            return (
                <>
                    {extension.groupAddress && (
                        <ExtensionField label="Token Group">
                            <Address pubkey={extension.groupAddress} link />
                        </ExtensionField>
                    )}
                    {extension.authority && (
                        <ExtensionField label="Group Pointer Authority">
                            <Address pubkey={extension.authority} link />
                        </ExtensionField>
                    )}
                </>
            );
        }
        case 'groupMemberPointer': {
            const extension = create(tokenExtension.state, GroupMemberPointer);
            return (
                <>
                    {extension.memberAddress && (
                        <ExtensionField label="Token Group Member">
                            <Address pubkey={extension.memberAddress} link />
                        </ExtensionField>
                    )}
                    {extension.authority && (
                        <ExtensionField label="Member Pointer Authority">
                            <Address pubkey={extension.authority} link />
                        </ExtensionField>
                    )}
                </>
            );
        }
        case 'tokenMetadata': {
            const extension = create(tokenExtension.state, TokenMetadata);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Metadata" /> : null}
                    <ExtensionField label="Mint">
                        <Address pubkey={extension.mint} link />
                    </ExtensionField>
                    {extension.updateAuthority && (
                        <ExtensionField label="Update Authority">
                            <Address pubkey={extension.updateAuthority} link />
                        </ExtensionField>
                    )}
                    <ExtensionField label="Name">{extension.name}</ExtensionField>
                    <ExtensionField label="Symbol">{extension.symbol}</ExtensionField>
                    <ExtensionField label="URI">
                        {getSafeExternalHref(extension.uri) ? (
                            <ExternalLink href={extension.uri}>
                                {extension.uri}
                                <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
                            </ExternalLink>
                        ) : (
                            extension.uri
                        )}
                    </ExtensionField>
                    {extension.additionalMetadata?.length > 0 && (
                        <>
                            <ExtensionFieldGroup>Additional Metadata</ExtensionFieldGroup>
                            {extension.additionalMetadata?.map(keyValuePair => (
                                <ExtensionField key={keyValuePair[0]} label={keyValuePair[0]}>
                                    {keyValuePair[1]}
                                </ExtensionField>
                            ))}
                        </>
                    )}
                </>
            );
        }
        case 'cpiGuard': {
            const extension = create(tokenExtension.state, CpiGuard);
            return <ExtensionField label="CPI Guard">{extension.lockCpi ? 'enabled' : 'disabled'}</ExtensionField>;
        }
        case 'confidentialTransferAccount': {
            const extension = create(tokenExtension.state, ConfidentialTransferAccount);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Confidential Transfer Account" /> : null}
                    <ExtensionField label="Status">{!extension.approved && 'not '}approved</ExtensionField>
                    <ExtensionField label="Elgamal Pubkey">{extension.elgamalPubkey}</ExtensionField>
                    <ExtensionField label="Confidential Credits">
                        {extension.allowConfidentialCredits ? 'enabled' : 'disabled'}
                    </ExtensionField>
                    <ExtensionField label="Non-confidential Credits">
                        {extension.allowNonConfidentialCredits ? 'enabled' : 'disabled'}
                    </ExtensionField>
                    <ExtensionField label="Available Balance">{extension.availableBalance}</ExtensionField>
                    <ExtensionField label="Decryptable Available Balance">
                        {extension.decryptableAvailableBalance}
                    </ExtensionField>
                    <ExtensionField label="Pending Balance, Low Bits">{extension.pendingBalanceLo}</ExtensionField>
                    <ExtensionField label="Pending Balance, High Bits">{extension.pendingBalanceHi}</ExtensionField>
                    <ExtensionField label="Pending Balance Credit Counter">
                        {extension.pendingBalanceCreditCounter}
                    </ExtensionField>
                    <ExtensionField label="Expected Pending Balance Credit Counter">
                        {extension.expectedPendingBalanceCreditCounter}
                    </ExtensionField>
                    <ExtensionField label="Actual Pending Balance Credit Counter">
                        {extension.actualPendingBalanceCreditCounter}
                    </ExtensionField>
                    <ExtensionField label="Maximum Pending Balance Credit Counter">
                        {extension.maximumPendingBalanceCreditCounter}
                    </ExtensionField>
                </>
            );
        }
        case 'immutableOwner': {
            return <ExtensionField label="Immutable Owner">enabled</ExtensionField>;
        }
        case 'memoTransfer': {
            const extension = create(tokenExtension.state, MemoTransfer);
            return (
                <ExtensionField label="Require Memo on Incoming Transfers">
                    {extension.requireIncomingTransferMemos ? 'enabled' : 'disabled'}
                </ExtensionField>
            );
        }
        case 'transferHookAccount': {
            const extension = create(tokenExtension.state, TransferHookAccount);
            return (
                <ExtensionField label="Transfer Hook Status">
                    {!extension.transferring && 'not '}transferring
                </ExtensionField>
            );
        }
        case 'nonTransferableAccount': {
            return <ExtensionField label="Non-Transferable">enabled</ExtensionField>;
        }
        case 'confidentialTransferFeeAmount': {
            const extension = create(tokenExtension.state, ConfidentialTransferFeeAmount);
            return (
                <ExtensionField label={<>Encrypted Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</>}>
                    {extension.withheldAmount}
                </ExtensionField>
            );
        }
        case 'tokenGroup': {
            const extension = create(tokenExtension.state, TokenGroup);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Group" /> : null}
                    <ExtensionField label="Mint">
                        <Address pubkey={extension.mint} link />
                    </ExtensionField>
                    {extension.updateAuthority && (
                        <ExtensionField label="Update Authority">
                            <Address pubkey={extension.updateAuthority} link />
                        </ExtensionField>
                    )}
                    <ExtensionField label="Current Size">{extension.size}</ExtensionField>
                    <ExtensionField label="Max Size">{extension.maxSize}</ExtensionField>
                </>
            );
        }
        case 'tokenGroupMember': {
            const extension = create(tokenExtension.state, TokenGroupMember);
            return (
                <>
                    {headerStyle === 'header' ? <HHeader name="Group Member" /> : null}
                    <ExtensionField label="Mint">
                        <Address pubkey={extension.mint} link />
                    </ExtensionField>
                    <ExtensionField label="Group">
                        <Address pubkey={extension.group} link />
                    </ExtensionField>
                    <ExtensionField label="Member Number">{extension.memberNumber}</ExtensionField>
                </>
            );
        }
        case 'unparseableExtension':
        default:
            return <ExtensionField label="Unknown Extension">unparseable</ExtensionField>;
    }
}
