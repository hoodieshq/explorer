import {
    getBurnV1InstructionDataSerializer,
    getCreateMasterEditionV3InstructionDataSerializer,
    getCreateMetadataAccountV3InstructionDataSerializer,
    getCreateV1InstructionDataSerializer,
    getDelegateCollectionV1InstructionDataSerializer,
    getDelegateDataV1InstructionDataSerializer,
    getDelegateLockedTransferV1InstructionDataSerializer,
    getDelegateSaleV1InstructionDataSerializer,
    getDelegateStakingV1InstructionDataSerializer,
    getDelegateStandardV1InstructionDataSerializer,
    getDelegateTransferV1InstructionDataSerializer,
    getDelegateUtilityV1InstructionDataSerializer,
    getLockV1InstructionDataSerializer,
    getMintNewEditionFromMasterEditionViaTokenInstructionDataSerializer,
    getMintV1InstructionDataSerializer,
    getPrintV1InstructionDataSerializer,
    getPrintV2InstructionDataSerializer,
    getRevokeCollectionV1InstructionDataSerializer,
    getRevokeDataV1InstructionDataSerializer,
    getRevokeLockedTransferV1InstructionDataSerializer,
    getRevokeSaleV1InstructionDataSerializer,
    getRevokeStakingV1InstructionDataSerializer,
    getRevokeStandardV1InstructionDataSerializer,
    getRevokeTransferV1InstructionDataSerializer,
    getRevokeUtilityV1InstructionDataSerializer,
    getTransferV1InstructionDataSerializer,
    getUnlockV1InstructionDataSerializer,
    getUpdateMetadataAccountV2InstructionDataSerializer,
    getUpdateV1InstructionDataSerializer,
    getUseV1InstructionDataSerializer,
    MPL_TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import { unwrapOptionRecursively } from '@metaplex-foundation/umi';
import type { Serializer } from '@metaplex-foundation/umi/serializers';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

// Widen umi's branded PublicKey<"metaqbxx…"> to plain string for base58 comparison at call sites.
export const TOKEN_METADATA_PROGRAM_ADDRESS: string = MPL_TOKEN_METADATA_PROGRAM_ID;

// `From` is contravariant; using `any` lets any generated serializer factory assign here.
// `To` is covariant so `unknown` accepts all deserialized shapes.
type SerializerFactory = () => Serializer<any, unknown>;

type InstructionDef = {
    name: string;
    accounts: readonly string[];
    getSerializer?: SerializerFactory;
};

type Entry = InstructionDef | { sub: Record<number, InstructionDef> };

// All v1 delegate/revoke variants share one account layout (only the sub-discriminator differs).
const DELEGATE_REVOKE_ACCOUNTS = [
    'delegateRecord', 'delegate', 'metadata', 'masterEdition', 'tokenRecord', 'mint', 'token',
    'authority', 'payer', 'systemProgram', 'sysvarInstructions', 'splTokenProgram',
    'authorizationRulesProgram', 'authorizationRules',
] as const;

const LOCK_UNLOCK_ACCOUNTS = [
    'authority', 'tokenOwner', 'token', 'mint', 'metadata', 'edition', 'tokenRecord', 'payer',
    'systemProgram', 'sysvarInstructions', 'splTokenProgram', 'authorizationRulesProgram',
    'authorizationRules',
] as const;

const PRINT_V1_ACCOUNTS = [
    'editionMetadata', 'edition', 'editionMint', 'editionTokenAccountOwner', 'editionTokenAccount',
    'editionMintAuthority', 'editionTokenRecord', 'masterEdition', 'editionMarkerPda', 'payer',
    'masterTokenAccountOwner', 'masterTokenAccount', 'masterMetadata', 'updateAuthority',
    'splTokenProgram', 'splAtaProgram', 'sysvarInstructions', 'systemProgram',
] as const;

const PRINT_V2_ACCOUNTS = [...PRINT_V1_ACCOUNTS, 'holderDelegateRecord', 'delegate'] as const;

// Primary discriminator (byte 0) → definition, or a sub-table keyed by byte 1.
// Discriminator values and account orders mirror the kinobi-generated IDL in
// @metaplex-foundation/mpl-token-metadata. If the library ever renumbers,
// the self-check test in the spec will catch drift.
const INSTRUCTIONS: Record<number, Entry> = {
    11: {
        accounts: [
            'newMetadata', 'newEdition', 'masterEdition', 'newMint', 'editionMarkPda',
            'newMintAuthority', 'payer', 'tokenAccountOwner', 'tokenAccount',
            'newMetadataUpdateAuthority', 'metadata', 'tokenProgram', 'systemProgram', 'rent',
        ],
        getSerializer: getMintNewEditionFromMasterEditionViaTokenInstructionDataSerializer,
        name: 'mintNewEditionFromMasterEditionViaToken',
    },
    15: {
        accounts: ['metadata', 'updateAuthority'],
        getSerializer: getUpdateMetadataAccountV2InstructionDataSerializer,
        name: 'updateMetadataAccountV2',
    },
    17: {
        accounts: [
            'edition', 'mint', 'updateAuthority', 'mintAuthority', 'payer', 'metadata',
            'tokenProgram', 'systemProgram', 'rent',
        ],
        getSerializer: getCreateMasterEditionV3InstructionDataSerializer,
        name: 'createMasterEditionV3',
    },
    18: {
        accounts: [
            'metadata', 'collectionAuthority', 'payer', 'collectionMint', 'collection',
            'collectionMasterEditionAccount', 'collectionAuthorityRecord',
        ],
        name: 'verifyCollection',
    },
    22: {
        accounts: [
            'metadata', 'collectionAuthority', 'collectionMint', 'collection',
            'collectionMasterEditionAccount', 'collectionAuthorityRecord',
        ],
        name: 'unverifyCollection',
    },
    25: {
        accounts: [
            'metadata', 'collectionAuthority', 'payer', 'updateAuthority', 'collectionMint',
            'collection', 'collectionMasterEditionAccount', 'collectionAuthorityRecord',
        ],
        name: 'setAndVerifyCollection',
    },
    29: {
        accounts: [
            'metadata', 'owner', 'mint', 'tokenAccount', 'masterEditionAccount', 'splTokenProgram',
            'collectionMetadata',
        ],
        name: 'burnNft',
    },
    30: {
        accounts: [
            'metadata', 'collectionAuthority', 'payer', 'collectionMint', 'collection',
            'collectionMasterEditionAccount', 'collectionAuthorityRecord',
        ],
        name: 'verifySizedCollectionItem',
    },
    31: {
        accounts: [
            'metadata', 'collectionAuthority', 'payer', 'collectionMint', 'collection',
            'collectionMasterEditionAccount', 'collectionAuthorityRecord',
        ],
        name: 'unverifySizedCollectionItem',
    },
    32: {
        accounts: [
            'metadata', 'collectionAuthority', 'payer', 'updateAuthority', 'collectionMint',
            'collection', 'collectionMasterEditionAccount', 'collectionAuthorityRecord',
        ],
        name: 'setAndVerifySizedCollectionItem',
    },
    33: {
        accounts: [
            'metadata', 'mint', 'mintAuthority', 'payer', 'updateAuthority', 'systemProgram',
            'rent',
        ],
        getSerializer: getCreateMetadataAccountV3InstructionDataSerializer,
        name: 'createMetadataAccountV3',
    },
    37: {
        accounts: [
            'metadata', 'owner', 'printEditionMint', 'masterEditionMint', 'printEditionTokenAccount',
            'masterEditionTokenAccount', 'masterEditionAccount', 'printEditionAccount',
            'editionMarkerAccount', 'splTokenProgram',
        ],
        name: 'burnEditionNft',
    },
    4: { accounts: ['metadata', 'owner', 'token'], name: 'updatePrimarySaleHappenedViaToken' },
    41: {
        accounts: [
            'authority', 'collectionMetadata', 'metadata', 'edition', 'mint', 'token',
            'masterEdition', 'masterEditionMint', 'masterEditionToken', 'editionMarker',
            'tokenRecord', 'systemProgram', 'sysvarInstructions', 'splTokenProgram',
        ],
        getSerializer: getBurnV1InstructionDataSerializer,
        name: 'burnV1',
    },
    42: {
        accounts: [
            'metadata', 'masterEdition', 'mint', 'authority', 'payer', 'updateAuthority',
            'systemProgram', 'sysvarInstructions', 'splTokenProgram',
        ],
        getSerializer: getCreateV1InstructionDataSerializer,
        name: 'createV1',
    },
    43: {
        accounts: [
            'token', 'tokenOwner', 'metadata', 'masterEdition', 'tokenRecord', 'mint', 'authority',
            'delegateRecord', 'payer', 'systemProgram', 'sysvarInstructions', 'splTokenProgram',
            'splAtaProgram', 'authorizationRulesProgram', 'authorizationRules',
        ],
        getSerializer: getMintV1InstructionDataSerializer,
        name: 'mintV1',
    },
    44: {
        sub: {
            0: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateCollectionV1InstructionDataSerializer, name: 'delegateCollectionV1' },
            1: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateSaleV1InstructionDataSerializer, name: 'delegateSaleV1' },
            2: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateTransferV1InstructionDataSerializer, name: 'delegateTransferV1' },
            3: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateDataV1InstructionDataSerializer, name: 'delegateDataV1' },
            4: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateUtilityV1InstructionDataSerializer, name: 'delegateUtilityV1' },
            5: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateStakingV1InstructionDataSerializer, name: 'delegateStakingV1' },
            6: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateStandardV1InstructionDataSerializer, name: 'delegateStandardV1' },
            7: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getDelegateLockedTransferV1InstructionDataSerializer, name: 'delegateLockedTransferV1' },
        },
    },
    45: {
        sub: {
            0: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeCollectionV1InstructionDataSerializer, name: 'revokeCollectionV1' },
            1: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeSaleV1InstructionDataSerializer, name: 'revokeSaleV1' },
            2: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeTransferV1InstructionDataSerializer, name: 'revokeTransferV1' },
            3: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeDataV1InstructionDataSerializer, name: 'revokeDataV1' },
            4: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeUtilityV1InstructionDataSerializer, name: 'revokeUtilityV1' },
            5: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeStakingV1InstructionDataSerializer, name: 'revokeStakingV1' },
            6: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeStandardV1InstructionDataSerializer, name: 'revokeStandardV1' },
            7: { accounts: DELEGATE_REVOKE_ACCOUNTS, getSerializer: getRevokeLockedTransferV1InstructionDataSerializer, name: 'revokeLockedTransferV1' },
        },
    },
    46: { accounts: LOCK_UNLOCK_ACCOUNTS, getSerializer: getLockV1InstructionDataSerializer, name: 'lockV1' },
    47: { accounts: LOCK_UNLOCK_ACCOUNTS, getSerializer: getUnlockV1InstructionDataSerializer, name: 'unlockV1' },
    49: {
        accounts: [
            'token', 'tokenOwner', 'destinationToken', 'destinationOwner', 'mint', 'metadata',
            'edition', 'tokenRecord', 'destinationTokenRecord', 'authority', 'payer',
            'systemProgram', 'sysvarInstructions', 'splTokenProgram', 'splAtaProgram',
            'authorizationRulesProgram', 'authorizationRules',
        ],
        getSerializer: getTransferV1InstructionDataSerializer,
        name: 'transferV1',
    },
    50: {
        accounts: [
            'authority', 'delegateRecord', 'token', 'mint', 'metadata', 'edition', 'payer',
            'systemProgram', 'sysvarInstructions', 'authorizationRulesProgram', 'authorizationRules',
        ],
        getSerializer: getUpdateV1InstructionDataSerializer,
        name: 'updateV1',
    },
    51: {
        accounts: [
            'authority', 'delegateRecord', 'token', 'mint', 'metadata', 'edition', 'payer',
            'systemProgram', 'sysvarInstructions', 'splTokenProgram', 'authorizationRulesProgram',
            'authorizationRules',
        ],
        getSerializer: getUseV1InstructionDataSerializer,
        name: 'useV1',
    },
    55: {
        sub: {
            0: { accounts: PRINT_V1_ACCOUNTS, getSerializer: getPrintV1InstructionDataSerializer, name: 'printV1' },
            1: { accounts: PRINT_V2_ACCOUNTS, getSerializer: getPrintV2InstructionDataSerializer, name: 'printV2' },
        },
    },
    7: { accounts: ['metadata', 'creator'], name: 'signMetadata' },
};

// Serializer construction allocates nested objects; cache per factory so hot parse paths don't rebuild.
const SERIALIZER_CACHE = new Map<SerializerFactory, Serializer<any, unknown>>();

function resolveSerializer(factory: SerializerFactory): Serializer<any, unknown> {
    let s = SERIALIZER_CACHE.get(factory);
    if (!s) {
        s = factory();
        SERIALIZER_CACHE.set(factory, s);
    }
    return s;
}

function lookup(data: Uint8Array): InstructionDef | undefined {
    if (data.length === 0) return undefined;
    const entry = INSTRUCTIONS[data[0]];
    if (!entry) return undefined;
    if ('name' in entry) return entry;
    return data.length >= 2 ? entry.sub[data[1]] : undefined;
}

export function identifyInstructionType(data: Uint8Array): string | undefined {
    return lookup(data)?.name;
}

export function parseMetaplexTokenMetadataInstruction(
    instruction: TransactionInstruction,
): { type: string; info: Record<string, unknown> } | undefined {
    const def = lookup(instruction.data);
    if (!def) return undefined;

    const accounts = mapAccounts(def.accounts, instruction);
    const data = def.getSerializer ? decodeData(def.getSerializer, instruction.data) : {};

    return { info: { ...accounts, ...data }, type: def.name };
}

function mapAccounts(
    labels: readonly string[],
    instruction: TransactionInstruction,
): Record<string, PublicKey> {
    const out: Record<string, PublicKey> = {};
    for (let i = 0; i < labels.length; i++) {
        const pubkey = instruction.keys[i]?.pubkey;
        if (pubkey) out[labels[i]] = pubkey;
    }
    return out;
}

function decodeData(factory: SerializerFactory, data: Uint8Array): Record<string, unknown> {
    try {
        const [raw] = resolveSerializer(factory).deserialize(data);
        const unwrapped = unwrapOptionRecursively(raw, () => undefined);
        if (!isRecord(unwrapped)) return {};
        // Strip discriminator bytes — already captured in the instruction type name.
        return Object.fromEntries(
            Object.entries(unwrapped).filter(
                ([k]) => k !== 'discriminator' && !k.endsWith('Discriminator'),
            ),
        );
    } catch {
        return {};
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
