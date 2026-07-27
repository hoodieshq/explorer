import { Address } from '@components/common/Address';
import { Signature } from '@components/common/Signature';
import { cn } from '@components/shared/utils';
import { type PublicKey, type VersionedMessage } from '@solana/web3.js';
import bs58 from 'bs58';
import React from 'react';
import * as nacl from 'tweetnacl';

import { Badge } from '@/app/components/shared/ui/badge';
// Deep import: upstream this comes from the `@features/transaction` barrel, which does not
// re-export CollapsibleSection at HEAD.
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';
import { BaseTable } from '@/app/shared/ui/Table';

import { DENSE_ROW_PADDING } from '../../shared/ui/Table/dense-row-padding';

// Match the Account List header: drop the dark background band so the header blends into the card,
// and use a subtle white/10 bottom rule instead of the default #282d2b separator (the first body
// row's top border is removed so the header owns the single dividing line).
const ACCOUNT_LIST_HEADER = cn(
    '[&_thead_th]:!bg-transparent',
    '[&_thead_th]:!border-b [&_thead_th]:!border-solid [&_thead_th]:!border-white/10',
    '[&_thead_th]:!text-xs',
    '[&_tbody_tr:first-child_td]:!border-t-0',
);

export function TransactionSignatures({
    signatures,
    message,
    rawMessage,
}: {
    signatures: (string | undefined)[];
    message: VersionedMessage;
    rawMessage: Uint8Array;
}) {
    const signatureRows = React.useMemo(() => {
        return signatures.map((signature, index) => {
            const publicKey = message.staticAccountKeys[index];

            let verified;
            if (signature) {
                const key = publicKey.toBytes();
                const rawSignature = bs58.decode(signature);
                verified = verifySignature({
                    key,
                    message: rawMessage,
                    signature: rawSignature,
                });
            }

            const props = {
                index,
                signature,
                signer: publicKey,
                verified,
            };

            return <SignatureRow key={publicKey.toBase58()} {...props} />;
        });
    }, [signatures, message, rawMessage]);

    return (
        <CollapsibleSection title="Signatures">
            <BaseTable ui="dashkit" variant="card" nowrap className={cn(DENSE_ROW_PADDING, ACCOUNT_LIST_HEADER)}>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="w-px text-outer-space-300">#</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-outer-space-300">Signature</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-outer-space-300">Signer</BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>{signatureRows}</BaseTable.Body>
            </BaseTable>
        </CollapsibleSection>
    );
}

function verifySignature({
    message,
    signature,
    key,
}: {
    message: Uint8Array;
    signature: Uint8Array;
    key: Uint8Array;
}): boolean {
    return nacl.sign.detached.verify(message, signature, key);
}

function SignatureRow({
    signature,
    signer,
    verified,
    index,
}: {
    signature: string | undefined;
    signer: PublicKey;
    verified?: boolean;
    index: number;
}) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell>
                <span className="text-outer-space-300">{index + 1}</span>
            </BaseTable.Cell>
            <BaseTable.Cell>
                <div className="flex flex-col gap-1">
                    <div>{signature ? <Signature signature={signature} /> : 'Missing Signature'}</div>
                    <div>
                        {verified === undefined ? (
                            'N/A'
                        ) : verified ? (
                            <Badge ui="dashkit" variant="success" className="mr-[3px]">
                                Valid
                            </Badge>
                        ) : (
                            <Badge ui="dashkit" variant="warning" className="mr-[3px]">
                                Invalid
                            </Badge>
                        )}
                    </div>
                </div>
            </BaseTable.Cell>
            <BaseTable.Cell>
                <div className="flex flex-col gap-1">
                    <Address pubkey={signer} link />
                    {index === 0 && (
                        <div>
                            <Badge ui="dashkit" variant="info" className="mr-[3px]">
                                Fee Payer
                            </Badge>
                        </div>
                    )}
                </div>
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
