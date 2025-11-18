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
                            name: 'discriminator',
                            type: {
                                kind: 'definedTypeLinkNode',
                                name: 'accountDiscriminator',
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
                    ],
                    kind: 'structTypeNode',
                },
                docs: [],
                kind: 'accountNode',
                name: 'metadata',
                pda: {
                    kind: 'pdaLinkNode',
                    name: 'metadata',
                },
            },
        ],
        definedTypes: [
            {
                docs: [],
                kind: 'definedTypeNode',
                name: 'accountDiscriminator',
                type: {
                    kind: 'enumTypeNode',
                    size: {
                        kind: 'enumSizeExactNode',
                        size: 1,
                    },
                    variants: [
                        {
                            kind: 'enumUnitVariantTypeNode',
                            name: 'Buffer',
                        },
                        {
                            kind: 'enumUnitVariantTypeNode',
                            name: 'Metadata',
                        },
                    ],
                },
            },
            {
                docs: [],
                kind: 'definedTypeNode',
                name: 'seed',
                type: {
                    kind: 'fixedSizeTypeNode',
                    size: 16,
                    type: {
                        kind: 'bytesTypeNode',
                    },
                },
            },
        ],
        errors: [],
        instructions: [
            {
                accounts: [
                    {
                        defaultValue: {
                            kind: 'pdaValueNode',
                            pda: {
                                kind: 'pdaLinkNode',
                                name: 'metadata',
                            },
                        },
                        docs: ['Metadata account the initialize.'],
                        isSigner: false,
                        isWritable: true,
                        kind: 'instructionAccountNode',
                        name: 'metadata',
                    },
                    {
                        docs: ['Authority (for canonical, must match program upgrade authority).'],
                        isSigner: true,
                        isWritable: false,
                        kind: 'instructionAccountNode',
                        name: 'authority',
                    },
                ],
                arguments: [],
                discriminators: [],
                docs: [],
                kind: 'instructionNode',
                name: 'initialize',
                optionalAccountStrategy: 'programId',
            },
        ],
        kind: 'programNode',
        name: 'programMock2',
        pdas: [
            {
                docs: ['The canonical derivation for metadata accounts managed by the program authority itself.'],
                kind: 'pdaNode',
                name: 'canonical',
                seeds: [
                    {
                        docs: ['The program to which the metadata belongs.'],
                        kind: 'variablePdaSeedNode',
                        name: 'program',
                        type: {
                            kind: 'publicKeyTypeNode',
                        },
                    },
                    {
                        docs: ['The seed deriving the metadata account.'],
                        kind: 'variablePdaSeedNode',
                        name: 'seed',
                        type: {
                            kind: 'definedTypeLinkNode',
                            name: 'seed',
                        },
                    },
                ],
            },
            {
                docs: ['The derivation for metadata accounts, canonical or not.'],
                kind: 'pdaNode',
                name: 'metadata',
                seeds: [
                    {
                        docs: ['The program to which the metadata belongs.'],
                        kind: 'variablePdaSeedNode',
                        name: 'program',
                        type: {
                            kind: 'publicKeyTypeNode',
                        },
                    },
                    {
                        docs: ['The third-party authority managing this metadata account, if non-canonical.'],
                        kind: 'variablePdaSeedNode',
                        name: 'authority',
                        type: {
                            item: {
                                kind: 'publicKeyTypeNode',
                            },
                            kind: 'optionTypeNode',
                        },
                    },
                    {
                        docs: ['The seed deriving the metadata account.'],
                        kind: 'variablePdaSeedNode',
                        name: 'seed',
                        type: {
                            kind: 'definedTypeLinkNode',
                            name: 'seed',
                        },
                    },
                ],
            },
        ],
        publicKey: 'ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S',
        version: '0.0.0',
    },
    standard: 'codama',
    version: '1.0.0',
};
