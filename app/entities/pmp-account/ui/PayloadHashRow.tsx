import { HashValue } from '@components/common/HashValue';

import { BaseTable } from '@/app/shared/ui/Table';

/**
 * The sha256 digest over the UNPACKED payload bytes.
 *
 * Lives in the entity because the account card and the instruction card render the same digest for the same bytes,
 * and a shared test id is what lets a spec assert they agree.
 *
 * `columns` is the host table's full width. The label takes one column and the value fills the rest, so a 2-column
 * account card and a 3-column instruction card both hand over their own count rather than a span computed outside.
 */
export function PayloadHashRow({ columns, hash }: { columns: number; hash: string }) {
    return (
        <BaseTable.Row data-testid="pmp-payload-data-hash">
            <BaseTable.Cell>Data Hash</BaseTable.Cell>
            <BaseTable.Cell className="md:text-right" colSpan={columns - 1}>
                <HashValue value={hash} alignRight />
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
