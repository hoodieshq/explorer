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
                        {
                            docs: [],
                            kind: 'structFieldTypeNode',
                            name: 'noticePeriods',
                            type: {
                                count: {
                                    kind: 'fixedCountNode',
                                    value: 5,
                                },
                                item: {
                                    format: 'u64',
                                    kind: 'numberTypeNode',
                                },
                                kind: 'arrayTypeNode',
                            },
                        },
                    ],
                    kind: 'structTypeNode',
                },
                discriminators: [],
                docs: ['* Initialize'],
                kind: 'accountNode',
                name: 'config',
                size: 130,
            },
        ],
        definedTypes: [],
        docs: [],
        errors: [
            {
                code: 6000,
                docs: ['MathOverflow: Math error'],
                kind: 'errorNode',
                message: 'Math error',
                name: 'mathOverflow',
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
                arguments: [
                    {
                        docs: [],
                        kind: 'instructionArgumentNode',
                        name: 'noticePeriods',
                        type: {
                            count: {
                                kind: 'fixedCountNode',
                                value: 5,
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
                name: 'initialize',
                optionalAccountStrategy: 'programId',
            },
        ],
        kind: 'programNode',
        name: 'programMock3',
        origin: 'anchor',
        pdas: [],
        publicKey: 'GB1MrbwXyGR3gqTYpfEpa2Mx9avAxv3dQpzVQ5nWJctu',
        version: '0.1.0',
    },
    standard: 'codama',
    version: '1.3.0',
};
