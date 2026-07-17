import { RawDataField } from '@/app/components/shared/RawDataField';
import type { Account } from '@/app/providers/accounts';

import { KeyValue } from '../../key-value/KeyValue';
import { Address } from './Address';
import { LABEL_WIDTH } from './constants';
import { SolBalance } from './SolBalance';

export type BaseRawAccountRowsProps = {
    account: Account;
    rawData?: Uint8Array;
    isLoading: boolean;
};

export function BaseRawAccountRows({ account, rawData, isLoading }: BaseRawAccountRowsProps) {
    return (
        <>
            <KeyValue label="Address" labelWidth={LABEL_WIDTH} row>
                <Address pubkey={account.pubkey} raw />
            </KeyValue>
            <KeyValue label="Balance (SOL)" labelWidth={LABEL_WIDTH} row>
                <SolBalance lamports={account.lamports} />
            </KeyValue>
            <KeyValue label="Assigned Program Id" labelWidth={LABEL_WIDTH} row>
                <Address pubkey={account.owner} link />
            </KeyValue>
            {account.space !== undefined && (
                <KeyValue label="Allocated Data Size" labelWidth={LABEL_WIDTH} row>
                    {account.space} byte(s)
                </KeyValue>
            )}
            <KeyValue label="Executable" labelWidth={LABEL_WIDTH} row>
                {account.executable ? 'Yes' : 'No'}
            </KeyValue>
            <KeyValue label="Raw Data" labelWidth={LABEL_WIDTH} row>
                <RawDataField data={rawData} filename={account.pubkey.toBase58()} loading={isLoading} />
            </KeyValue>
        </>
    );
}
