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
                            name: 'admin',
                            type: {
                                kind: 'publicKeyTypeNode',
                            },
                        },
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'paused',
                            type: {
                                kind: 'booleanTypeNode',
                            },
                        },
                    ],
                    kind: 'structTypeNode',
                },
                discriminators: [],
                docs: [],
                kind: 'accountNode',
                name: 'config',
            },
        ],
        definedTypes: [
            {
                docs: [],
                kind: 'definedTypeNode',
                name: 'gaugeType',
                type: {
                    kind: 'enumTypeNode',
                    size: {
                        kind: 'enumSizeExactNode',
                        size: 1,
                    },
                    variants: [
                        {
                            kind: 'enumUnitVariantTypeNode',
                            name: 'LP',
                        },
                        {
                            kind: 'enumUnitVariantTypeNode',
                            name: 'SingleAsset',
                        },
                    ],
                },
            },
        ],
        docs: [],
        errors: [
            {
                code: 6000,
                docs: ['ProgramPaused: Program is paused'],
                kind: 'errorNode',
                message: 'Program is paused',
                name: 'programPaused',
            },
            {
                code: 6001,
                docs: ['ProgramIsAlreadyInitialized: Program is already initialized'],
                kind: 'errorNode',
                message: 'Program is already initialized',
                name: 'programIsAlreadyInitialized',
            },
        ],
        instructions: [
            {
                accounts: [
                    {
                        docs: [],
                        isOptional: false,
                        isSigner: false,
                        isWritable: true,
                        kind: 'instructionAccountNode',
                        name: 'config',
                    },
                    {
                        docs: [],
                        isOptional: false,
                        isSigner: true,
                        isWritable: false,
                        kind: 'instructionAccountNode',
                        name: 'admin',
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
        name: 'programMock1',
        origin: 'anchor',
        pdas: [],
        publicKey: '62gRsAdA6dcbf4Frjp7YRFLpFgdGu8emAACcnnREX3L3',
        version: '0.1.0',
    },
    standard: 'codama',
    version: '1.3.0',
};
