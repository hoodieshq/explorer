import type { Decorator } from '@storybook-config/types';
import { SWRConfig } from 'swr';

import { populatePartialParsedTokenExtension } from '@/app/utils/token-extension';
import type { TokenExtension } from '@/app/validators/accounts/token-extension';

import type { ParsedTokenExtension } from '../types';

// The production example mint from HOO-935, so the stories match what the page shows.
export const MINT_ADDRESS = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';
const AUTHORITY = '2apBGMsS6ti9RyF5TwQTDswXBWskiJP2LD4cUEDqYJjk';
const WITHDRAW_AUTHORITY = '3apBGMsS6ti9RyF5TwQTDswXBWskiJP2LD4cUEDqYJjk';

// One extension of each value kind the field table has to fit on a phone: addresses, a raw ElGamal key,
// dates, a long URI and additional metadata.
export const TOKEN_EXTENSIONS: TokenExtension[] = [
    {
        extension: 'transferFeeConfig',
        state: {
            newerTransferFee: { epoch: 200, maximumFee: 2000000, transferFeeBasisPoints: 200 },
            olderTransferFee: { epoch: 100, maximumFee: 1000000, transferFeeBasisPoints: 100 },
            transferFeeConfigAuthority: AUTHORITY,
            withdrawWithheldAuthority: WITHDRAW_AUTHORITY,
            withheldAmount: 500000,
        },
    },
    {
        extension: 'confidentialTransferMint',
        state: {
            auditorElgamalPubkey: 'hFXg5FzHK3TKvKq8oYvU4bCBe7sTEB1YnY1yFq3zXzA=',
            authority: AUTHORITY,
            autoApproveNewAccounts: false,
        },
    },
    {
        extension: 'interestBearingConfig',
        state: {
            currentRate: 500,
            initializationTimestamp: 1743000000,
            lastUpdateTimestamp: 1761000000,
            preUpdateAverageRate: 400,
            rateAuthority: AUTHORITY,
        },
    },
    { extension: 'permanentDelegate', state: { delegate: AUTHORITY } },
    { extension: 'metadataPointer', state: { authority: AUTHORITY, metadataAddress: MINT_ADDRESS } },
    {
        extension: 'tokenMetadata',
        state: {
            additionalMetadata: [
                ['issuer', 'Example Issuer Ltd.'],
                ['terms', 'https://example.test/legal/token-terms-and-conditions-2026.pdf'],
            ],
            mint: MINT_ADDRESS,
            name: 'Sample Token',
            symbol: 'SAMP',
            updateAuthority: AUTHORITY,
            uri: 'https://arweave.example.test/metadata/2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo/token.json',
        },
    },
];

// The same shape `TokenExtensionsCard` builds before it renders the section.
export function parseTokenExtensions(extensions: TokenExtension[]): ParsedTokenExtension[] {
    return extensions.map(({ extension, state }) => ({
        ...populatePartialParsedTokenExtension(extension),
        extension,
        parsed: state,
    }));
}

export const PARSED_TOKEN_EXTENSIONS = parseTokenExtensions(TOKEN_EXTENSIONS);

// Encrypted amounts and ElGamal keys are base64 on chain: a ciphertext is 64 bytes, a decryptable
// balance 36, a key 32.
const CIPHERTEXT = 'CzBVep/E6Q4zWH2ix+wRNluApcrvFDleg6jN8hc8YYar0PUaP2SJrtP4HUJnjLHW+yBFao+02f4jSG2St9wBJg==';
const DECRYPTABLE = 'CzBVep/E6Q4zWH2ix+wRNluApcrvFDleg6jN8hc8YYar0PUa';
const ELGAMAL_KEY = 'CzBVep/E6Q4zWH2ix+wRNluApcrvFDleg6jN8hc8YYY=';

/**
 * Every extension type `TokenExtensionRow` knows, for the gallery story. A type appears twice when a
 * missing optional value changes what it renders: an extension whose only field is an unset authority
 * renders nothing at all.
 */
export const ALL_TOKEN_EXTENSIONS: { note?: string; value: TokenExtension }[] = [
    ...TOKEN_EXTENSIONS.map(value => ({ value })),
    { value: { extension: 'transferFeeAmount', state: { withheldAmount: 1500000 } } },
    { value: { extension: 'mintCloseAuthority', state: { closeAuthority: AUTHORITY } } },
    // RPC returns an unset authority as `null` (the validators use `nullable`), so the fixtures do too.
    // eslint-disable-next-line unicorn/no-null
    { note: 'no close authority', value: { extension: 'mintCloseAuthority', state: { closeAuthority: null } } },
    // eslint-disable-next-line unicorn/no-null
    { note: 'no delegate', value: { extension: 'permanentDelegate', state: { delegate: null } } },
    {
        value: {
            extension: 'confidentialTransferAccount',
            state: {
                actualPendingBalanceCreditCounter: 3,
                allowConfidentialCredits: true,
                allowNonConfidentialCredits: false,
                approved: true,
                availableBalance: CIPHERTEXT,
                decryptableAvailableBalance: DECRYPTABLE,
                elgamalPubkey: ELGAMAL_KEY,
                expectedPendingBalanceCreditCounter: 3,
                maximumPendingBalanceCreditCounter: 65536,
                pendingBalanceCreditCounter: 3,
                pendingBalanceHi: CIPHERTEXT,
                pendingBalanceLo: CIPHERTEXT,
            },
        },
    },
    {
        value: {
            extension: 'confidentialTransferFeeConfig',
            state: {
                authority: AUTHORITY,
                harvestToMintEnabled: true,
                withdrawWithheldAuthorityElgamalPubkey: ELGAMAL_KEY,
                withheldAmount: CIPHERTEXT,
            },
        },
    },
    { value: { extension: 'confidentialTransferFeeAmount', state: { withheldAmount: CIPHERTEXT } } },
    { value: { extension: 'defaultAccountState', state: { accountState: 'frozen' } } },
    { value: { extension: 'immutableOwner', state: {} } },
    { value: { extension: 'memoTransfer', state: { requireIncomingTransferMemos: true } } },
    { value: { extension: 'nonTransferable', state: {} } },
    { value: { extension: 'nonTransferableAccount', state: {} } },
    { value: { extension: 'cpiGuard', state: { lockCpi: true } } },
    { value: { extension: 'transferHook', state: { authority: AUTHORITY, programId: WITHDRAW_AUTHORITY } } },
    { value: { extension: 'transferHookAccount', state: { transferring: false } } },
    { value: { extension: 'groupPointer', state: { authority: AUTHORITY, groupAddress: MINT_ADDRESS } } },
    { value: { extension: 'groupMemberPointer', state: { authority: AUTHORITY, memberAddress: MINT_ADDRESS } } },
    {
        value: {
            extension: 'tokenGroup',
            state: { maxSize: 100, mint: MINT_ADDRESS, size: 12, updateAuthority: AUTHORITY },
        },
    },
    {
        value: {
            extension: 'tokenGroupMember',
            state: { group: WITHDRAW_AUTHORITY, memberNumber: 7, mint: MINT_ADDRESS },
        },
    },
    {
        value: {
            extension: 'scaledUiAmountConfig',
            state: {
                authority: AUTHORITY,
                multiplier: '1.0125',
                newMultiplier: '1.025',
                newMultiplierEffectiveTimestamp: 1767225600,
            },
        },
    },
    { value: { extension: 'pausableConfig', state: { authority: AUTHORITY, paused: true } } },
    { value: { extension: 'pausableAccount', state: {} } },
    { value: { extension: 'permissionedBurnConfig', state: { authority: AUTHORITY } } },
    { value: { extension: 'unparseableExtension', state: {} } },
];

// Storybook has no /api/token-info backend, so the card's token-info request never settles and it
// stays on LoadingCard. Skipping that first request leaves SWR with no data and not loading, which is
// what the card sees for a token missing from the token list.
export const withTokenInfoSkipped: Decorator = Story => (
    <SWRConfig value={{ revalidateOnMount: false }}>
        <Story />
    </SWRConfig>
);
