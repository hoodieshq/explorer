// eslint-disable-next-line import/no-anonymous-default-export
export default {
    additionalPrograms: [],
    kind: 'rootNode',
    program: {
        accounts: [
            {
                data: {
                    fields: [
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'rewardInfos',
                            type: {
                                count: {
                                    kind: 'fixedCountNode',
                                    value: 3,
                                },
                                item: {
                                    kind: 'definedTypeLinkNode',
                                    name: 'whirlpoolRewardInfo',
                                },
                                kind: 'arrayTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'tickSpacing',
                            type: {
                                format: 'u16',
                                kind: 'numberTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'tokenMintA',
                            type: {
                                kind: 'publicKeyTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'tokenVaultA',
                            type: {
                                kind: 'publicKeyTypeNode',
                            },
                        },
                    ],
                    kind: 'structTypeNode',
                },
                discriminators: [],
                docs: [],
                kind: 'accountNode',
                name: 'whirlpool',
                size: 653,
            },
        ],
        definedTypes: [
            {
                docs: [],
                kind: 'definedTypeNode',
                name: 'whirlpoolRewardInfo',
                type: {
                    fields: [
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'mint',
                            type: {
                                kind: 'publicKeyTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'vault',
                            type: {
                                kind: 'publicKeyTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'authority',
                            type: {
                                kind: 'publicKeyTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'emissionsPerSecondX64',
                            type: {
                                format: 'u128',
                                kind: 'numberTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'growthGlobalX64',
                            type: {
                                format: 'u128',
                                kind: 'numberTypeNode',
                            },
                        },
                    ],
                    kind: 'structTypeNode',
                },
            },
            {
                docs: [],
                kind: 'definedTypeNode',
                name: 'remainingAccountsInfo',
                type: {
                    fields: [
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'accountsType',
                            type: {
                                kind: 'definedTypeLinkNode',
                                name: 'accountsType',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'optionalAccounts',
                            type: {
                                item: {
                                    count: {
                                        kind: 'fixedCountNode',
                                        value: 3,
                                    },
                                    item: {
                                        kind: 'booleanTypeNode',
                                    },
                                    kind: 'arrayTypeNode',
                                },
                                kind: 'optionTypeNode',
                            },
                        },
                    ],
                    kind: 'structTypeNode',
                },
            },
            {
                docs: [],
                kind: 'definedTypeNode',
                name: 'accountsType',
                type: {
                    kind: 'enumTypeNode',
                    size: {
                        kind: 'enumSizeExactNode',
                        size: 1,
                    },
                    variants: [
                        {
                            kind: 'enumUnitVariantTypeNode',
                            name: 'TokenTransferHooks',
                        },
                        {
                            kind: 'enumUnitVariantTypeNode',
                            name: 'TokenExtraAccountMetas',
                        },
                    ],
                },
            },
        ],
        docs: [],
        errors: [],
        instructions: [
            {
                accounts: [
                    {
                        docs: [],
                        isOptional: false,
                        isSigner: false,
                        isWritable: false,
                        kind: 'instructionAccountNode',
                        name: 'whirlpoolsConfig',
                    },
                    {
                        docs: [],
                        isOptional: false,
                        isSigner: false,
                        isWritable: false,
                        kind: 'instructionAccountNode',
                        name: 'tokenMintA',
                    },
                ],
                arguments: [
                    {
                        docs: [],
                        kind: 'instructionArgumentNode',
                        name: 'tickSpacing',
                        type: {
                            format: 'u16',
                            kind: 'numberTypeNode',
                        },
                    },
                    {
                        docs: [],
                        kind: 'instructionArgumentNode',
                        name: 'initialSqrtPrice',
                        type: {
                            count: {
                                kind: 'fixedCountNode',
                                value: 2,
                            },
                            item: {
                                format: 'u64',
                                kind: 'numberTypeNode',
                            },
                            kind: 'arrayTypeNode',
                        },
                    },
                ],
                discriminators: [],
                docs: [],
                kind: 'instructionNode',
                name: 'initializePool',
                optionalAccountStrategy: 'programId',
            },
        ],
        kind: 'programNode',
        name: 'programMock4',
        origin: 'anchor',
        pdas: [],
        publicKey: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
        version: '0.3.4',
    },
    standard: 'codama',
    version: '1.2.11',
};
