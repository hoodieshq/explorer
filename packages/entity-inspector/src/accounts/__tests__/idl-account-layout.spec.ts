import { type AccountDecode, IDL_ERROR__LAYOUT_WALK_FAILED, IdlStandard, isIdlError } from '@explorer/idl-decode';
import { describe, expect, it, vi } from 'vitest';

import type { InspectorLogger } from '../../logger.js';
import { describeIdlAccountLayout } from '../idl-account-layout.js';
import {
    EMPTY_ACCOUNT_SIZE,
    emptyIdlClient,
    NESTED_ACCOUNT_SIZE,
    nestedIdlClient,
    VAULT_ACCOUNT_SIZE,
    vaultIdlClient,
    wideIdlClient,
} from './idl-layout-fixtures.js';

const SUBJECT = { address: 'VaultAddress', owner: 'OwnerProgram' };

function createLoggerMock(): InspectorLogger {
    return { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

describe('describeIdlAccountLayout', () => {
    it('should describe each named field with its byte range, schema kind, format and docs', () => {
        const data = new Uint8Array(VAULT_ACCOUNT_SIZE);
        const client = vaultIdlClient();

        const layout = describeIdlAccountLayout(client.decodeAccount(data), data, createLoggerMock(), SUBJECT);

        expect(layout).toEqual({
            fields: [
                {
                    docs: ['The vault owner.'],
                    kind: 'publicKeyTypeNode',
                    offset: 0,
                    path: 'authority',
                    size: 32,
                },
                // a numeric field carries how the program declared it; neither field has an `omitted` count
                { format: 'u32', kind: 'numberTypeNode', offset: 32, path: 'total', size: 4 },
            ],
        });
    });

    it('should omit the root entry — the account already reports its own size', () => {
        const data = new Uint8Array(VAULT_ACCOUNT_SIZE);
        const client = vaultIdlClient();

        const layout = describeIdlAccountLayout(client.decodeAccount(data), data, createLoggerMock(), SUBJECT);

        expect(layout?.fields.map(field => field.path)).toEqual(['authority', 'total']);
    });

    it('should spell a nested path the way the decoded payload is addressed', () => {
        const data = new Uint8Array(NESTED_ACCOUNT_SIZE);
        const client = nestedIdlClient();
        const decode = client.decodeAccount(data);

        const layout = describeIdlAccountLayout(decode, data, createLoggerMock(), SUBJECT);

        // the array, each element body, and each element's own fields — the element index is a segment
        expect(layout?.fields.map(field => [field.path, field.offset, field.size])).toEqual([
            ['receipts', 0, 18],
            ['receipts.0', 0, 9],
            ['receipts.0.price', 0, 8],
            ['receipts.0.tableNumber', 8, 1],
            ['receipts.1', 9, 9],
            ['receipts.1.price', 9, 8],
            ['receipts.1.tableNumber', 17, 1],
        ]);
        // every row's path reads the value it describes out of the very payload the reply carries
        const info = client.getDecodedData(decode) as { receipts: { price: bigint }[] };
        expect(info.receipts[1]?.price).toBe(0n);
    });

    it('should cap a long layout and report how many fields it dropped', () => {
        const { client, size } = wideIdlClient(300);
        const data = new Uint8Array(size);

        const layout = describeIdlAccountLayout(client.decodeAccount(data), data, createLoggerMock(), SUBJECT);

        expect(layout?.fields).toHaveLength(256);
        expect(layout?.omitted).toBe(44);
        // the cap keeps the prefix, so the surviving rows still start at the account's first byte
        expect(layout?.fields[0]).toMatchObject({ offset: 0, path: 'slot0' });
    });

    it('should report no `omitted` count when the layout fits exactly', () => {
        const { client, size } = wideIdlClient(256);
        const data = new Uint8Array(size);

        const layout = describeIdlAccountLayout(client.decodeAccount(data), data, createLoggerMock(), SUBJECT);

        expect(layout?.fields).toHaveLength(256);
        expect(layout).not.toHaveProperty('omitted');
    });

    it('should report no layout at all when the schema names no field', () => {
        const logger = createLoggerMock();
        const data = new Uint8Array(EMPTY_ACCOUNT_SIZE);

        const layout = describeIdlAccountLayout(emptyIdlClient().decodeAccount(data), data, logger, SUBJECT);

        // only the root entry exists, and it addresses no value — an empty `fields` would say no more
        expect(layout).toBeUndefined();
        expect(logger.warn).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return undefined and warn when the layout cannot be built, leaving the decode intact', () => {
        const logger = createLoggerMock();
        const data = new Uint8Array(VAULT_ACCOUNT_SIZE);
        const decode = vaultIdlClient().decodeAccount(data);

        // the same decode replayed against bytes it never read — the walk cannot anchor a range
        const layout = describeIdlAccountLayout(decode, data.subarray(0, 8), logger, SUBJECT);

        expect(layout).toBeUndefined();
        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            '[entity-inspector] idl account layout failed',
            // the account is named, so the one IDL-specific failure mode is reproducible from the log
            expect.objectContaining({ address: 'VaultAddress', dataLength: 8, owner: 'OwnerProgram' }),
        );
        // the typed code, not merely "something threw" — an unrelated failure must not pass this test
        const [, context] = vi.mocked(logger.warn).mock.calls[0] ?? [];
        expect(isIdlError((context as { error: unknown }).error, IDL_ERROR__LAYOUT_WALK_FAILED)).toBe(true);
    });

    it('should decline without a log for an arm that carries no layout', () => {
        const logger = createLoggerMock();

        // the anchor arm is a consumer's fallback-decoder rescue — having no byte layout is its normal outcome
        const layout = describeIdlAccountLayout(
            { decoded: { authority: 'abc' }, kind: IdlStandard.Anchor },
            new Uint8Array(4),
            logger,
            SUBJECT,
        );

        expect(layout).toBeUndefined();
        expect(logger.warn).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should report a malformed envelope as a typed walk failure, not as a crash', () => {
        const logger = createLoggerMock();
        // eslint-disable-next-line typescript/consistent-type-assertions -- deliberately malformed, which the types forbid
        const malformed = { decoded: { authority: 'abc' }, kind: IdlStandard.Codama } as unknown as AccountDecode;

        const layout = describeIdlAccountLayout(malformed, new Uint8Array(4), logger, SUBJECT);

        // the walk narrows the envelope inside its own guard, so a bad one is a domain error here
        expect(layout).toBeUndefined();
        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('should log a defect in the row building as an error, not as a routine decline', async () => {
        const logger = createLoggerMock();
        // the walk throws only typed errors, so the remaining risk is this module's own post-processing
        vi.resetModules();
        vi.doMock('@explorer/idl-decode', async () => ({
            ...(await vi.importActual<typeof import('@explorer/idl-decode')>('@explorer/idl-decode')),
            flattenLayout: () => {
                throw new TypeError('flattenLayout is broken');
            },
        }));

        try {
            const { describeIdlAccountLayout: subject } = await import('../idl-account-layout.js');
            const data = new Uint8Array(VAULT_ACCOUNT_SIZE);

            const layout = subject(vaultIdlClient().decodeAccount(data), data, logger, SUBJECT);

            expect(layout).toBeUndefined();
            expect(logger.warn).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
                '[entity-inspector] idl account layout crashed',
                expect.objectContaining({ address: 'VaultAddress', owner: 'OwnerProgram' }),
            );
        } finally {
            vi.doUnmock('@explorer/idl-decode');
            vi.resetModules();
        }
    });
});
