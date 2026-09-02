import { HashValue } from '@components/common/HashValue';

import { BaseTable } from '@/app/shared/ui/Table';

/**
 * The sha256 digest over the UNPACKED payload bytes.
 */
export function PayloadHashRow({ hash }: { hash: string }) {
    return (
        <BaseTable.Row data-testid="pmp-payload-data-hash">
            <BaseTable.Cell>Data Hash</BaseTable.Cell>
            <BaseTable.Cell colSpan={2} className="text-right">
                <HashValue value={hash} alignRight />
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
