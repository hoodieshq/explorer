// eslint-disable-next-line import/no-anonymous-default-export
export default {
    additionalPrograms: [],
    kind: 'rootNode',
    program: {
        accounts: [],
        definedTypes: [],
        docs: [],
        errors: [],
        instructions: [
            {
                accounts: [
                    {
                        docs: [],
                        isOptional: true,
                        isSigner: false,
                        isWritable: true,
                        kind: 'instructionAccountNode',
                        name: 'config',
                    },
                    {
                        defaultValue: {
                            kind: 'signerValueNode',
                        },
                        docs: [],
                        isOptional: false,
                        isSigner: true,
                        isWritable: true,
                        kind: 'instructionAccountNode',
                        name: 'payer',
                    },
                ],
                arguments: [
                    {
                        docs: [],
                        kind: 'instructionArgumentNode',
                        name: 'seed',
                        type: {
                            encoding: 'utf8',
                            kind: 'stringTypeNode',
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
        name: 'minimal',
        origin: 'anchor',
        pdas: [],
        publicKey: 'minima1111111111111111111111111111111',
        version: '0.1.0',
    },
    standard: 'codama',
    version: '1.0.0',
};
