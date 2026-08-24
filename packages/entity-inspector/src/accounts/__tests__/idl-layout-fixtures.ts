import { type IdlClient, tryCreateIdlClient } from '@explorer/idl-decode';

// Codama roots as plain data — the node constructors live in `codama`, which this package does not
// depend on, and a root IS its JSON, so literals are the honest fixture rather than a stand-in.

type Json = Record<string, unknown>;

const PROGRAM_ADDRESS = '11111111111111111111111111111111';

/** `sizeDiscriminatorNode` matches on byte length alone — the same discriminator SPL Token's own root uses. */
function codamaRoot(account: Json): Json {
    return {
        additionalPrograms: [],
        kind: 'rootNode',
        program: {
            accounts: [account],
            definedTypes: [],
            errors: [],
            instructions: [],
            kind: 'programNode',
            name: 'vault',
            pdas: [],
            prefix: '',
            publicKey: PROGRAM_ADDRESS,
            version: '1.0.0',
        },
        standard: 'codama',
        version: '1.0.0',
    };
}

/** The untrusted-input route, since a literal root is exactly the unvalidated JSON it exists for. */
function idlClient(root: Json): IdlClient {
    const [error, client] = tryCreateIdlClient(root);
    if (error) throw error;
    return client;
}

function field(name: string, type: Json, docs: string[] = []): Json {
    return { docs, kind: 'structFieldTypeNode', name, type };
}

const pubkey: Json = { kind: 'publicKeyTypeNode' };
const u32: Json = { endian: 'le', format: 'u32', kind: 'numberTypeNode' };
const u64: Json = { endian: 'le', format: 'u64', kind: 'numberTypeNode' };

/** `authority: pubkey` (docs) + `total: u32` — 36 bytes, the smallest root that exercises every row key. */
export const VAULT_ACCOUNT_SIZE = 36;

export function vaultIdlClient(): IdlClient {
    return idlClient(
        codamaRoot({
            data: {
                fields: [field('authority', pubkey, ['The vault owner.']), field('total', u32)],
                kind: 'structTypeNode',
            },
            discriminators: [{ kind: 'sizeDiscriminatorNode', size: VAULT_ACCOUNT_SIZE }],
            docs: [],
            kind: 'accountNode',
            name: 'vault',
        }),
    );
}

/** A fixed array of two structs — the shape whose rows carry a nested path (`receipts.0.price`). */
export const NESTED_ACCOUNT_SIZE = 18;

export function nestedIdlClient(): IdlClient {
    const receipt: Json = {
        fields: [field('price', u64), field('tableNumber', { format: 'u8', kind: 'numberTypeNode' })],
        kind: 'structTypeNode',
    };
    return idlClient(
        codamaRoot({
            data: {
                fields: [
                    field('receipts', {
                        count: { kind: 'fixedCountNode', value: 2 },
                        item: receipt,
                        kind: 'arrayTypeNode',
                    }),
                ],
                kind: 'structTypeNode',
            },
            discriminators: [{ kind: 'sizeDiscriminatorNode', size: NESTED_ACCOUNT_SIZE }],
            docs: [],
            kind: 'accountNode',
            name: 'nested',
        }),
    );
}

/** A struct that names no field — the one shape whose layout holds nothing but the root entry. */
export const EMPTY_ACCOUNT_SIZE = 8;

export function emptyIdlClient(): IdlClient {
    return idlClient(
        codamaRoot({
            data: { fields: [], kind: 'structTypeNode' },
            discriminators: [{ kind: 'sizeDiscriminatorNode', size: EMPTY_ACCOUNT_SIZE }],
            docs: [],
            kind: 'accountNode',
            name: 'empty',
        }),
    );
}

/** `count` u64 fields — the cheapest way to name more fields than the layout cap allows. */
export function wideIdlClient(count: number): { client: IdlClient; size: number } {
    const size = count * 8;
    return {
        client: idlClient(
            codamaRoot({
                data: {
                    fields: Array.from({ length: count }, (_, index) => field(`slot${index}`, u64)),
                    kind: 'structTypeNode',
                },
                discriminators: [{ kind: 'sizeDiscriminatorNode', size }],
                docs: [],
                kind: 'accountNode',
                name: 'wide',
            }),
        ),
        size,
    };
}
