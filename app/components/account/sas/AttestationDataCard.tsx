import { Account, useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import { FetchStatus } from '@providers/cache';
import {
    Attestation as SasAttestation,
    decodeSchema,
    deserializeAttestationData,
    Schema as SasSchema,
    SchemaDataType,
} from '@solana/attestation';
import React from 'react';

import { LoadingCard } from '@/app/components/common/LoadingCard';
import { toBase64, toHex } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { decodeAccount, decodeWithType, isAttestationAccount } from '@/app/utils/attestation-service';
import { mapToPublicKey } from '@/app/utils/kit-wrapper';

import { BaseAttestationDataCard } from './BaseAttestationDataCard';

export function AttestationDataCard({ account, onNotFound }: { account?: Account; onNotFound: () => never }) {
    if (!account || !isAttestationAccount(account)) {
        return onNotFound();
    }

    const decoded = decodeAccount(account);
    if (decoded?.type === 'attestation') {
        return <AttestationCard attestation={decoded.data.data} />;
    } else if (decoded?.type === 'schema') {
        return <SchemaCard schema={decoded.data.data} />;
    }

    return onNotFound();
}

function SchemaCard({ schema }: { schema: SasSchema }) {
    const layout = Object.fromEntries(schema.fieldNames.map((name, i) => [name, SchemaDataType[schema.layout[i]]]));
    return <BaseAttestationDataCard data={layout} />;
}

/**
 * `VecU8` fields hold binary blobs such as hashes, which decode to number
 * arrays and render as one row per byte. Hex keeps them readable and matches
 * how @solana/attestation surfaces the same content in a `String` field.
 */
function withByteFieldsAsHex(schema: SasSchema, data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        schema.fieldNames.map((name, index) => {
            const value = data[name];
            const isByteVector = schema.layout[index] === SchemaDataType.VecU8 && Array.isArray(value);
            return [name, isByteVector ? `0x${toHex(Uint8Array.from(value as number[]))}` : value];
        }),
    );
}

function AttestationCard({ attestation }: { attestation: SasAttestation }) {
    const schemaAccountInfo = useAccountInfo(mapToPublicKey(attestation.schema).toBase58());
    const fetchAccountInfo = useFetchAccountInfo();
    React.useEffect(() => {
        if (!schemaAccountInfo?.data) {
            fetchAccountInfo(mapToPublicKey(attestation.schema), 'parsed');
        }
    }, [schemaAccountInfo?.data, fetchAccountInfo, attestation.schema]);

    const isFetchingSchema = !schemaAccountInfo || schemaAccountInfo.status === FetchStatus.Fetching;
    if (isFetchingSchema) {
        return <LoadingCard message="Loading attestation data" />;
    }

    let decoded: any | null = null;
    try {
        if (schemaAccountInfo?.data) {
            const schema: SasSchema = decodeWithType(schemaAccountInfo.data, 'schema', decodeSchema)?.data.data;
            decoded = withByteFieldsAsHex(
                schema,
                deserializeAttestationData<Record<string, unknown>>(schema, Uint8Array.from(attestation.data)),
            );
        }
    } catch (e) {
        Logger.error(e);
    }

    if (!decoded) {
        return <BaseAttestationDataCard raw={toBase64(new Uint8Array(attestation.data))} />;
    }

    return <BaseAttestationDataCard data={decoded} />;
}
