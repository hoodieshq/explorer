import { TableCardBody } from '@components/common/TableCardBody';
import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { ProgramIdlSlot } from '@entities/idl';
import { ProgramField } from '@entities/instruction-card';
import { useCluster } from '@providers/cluster';
import { useScrollAnchor } from '@providers/scroll-anchor';
import { TransactionInstruction } from '@solana/web3.js';
import { getProgramName } from '@utils/tx';

import { Badge } from '@/app/components/shared/ui/badge';
import { BaseTable } from '@/app/shared/ui/Table';
import getInstructionCardScrollAnchorId from '@/app/utils/get-instruction-card-scroll-anchor-id';

import { BaseRawDetails } from '../common/BaseRawDetails';

export function UnknownDetailsCard({
    index,
    childIndex,
    ix,
    innerCards,
    notice,
}: {
    index: number;
    childIndex?: number;
    ix: TransactionInstruction;
    innerCards?: React.ReactNode[];
    /** A full-width first row, e.g. why the instruction stayed unknown. */
    notice?: React.ReactNode;
}) {
    const { cluster } = useCluster();
    const scrollAnchorRef = useScrollAnchor(
        getInstructionCardScrollAnchorId(childIndex !== undefined ? [index + 1, childIndex + 1] : [index + 1]),
    );

    return (
        <CollapsibleCard
            ref={scrollAnchorRef}
            defaultExpanded={false}
            headerButtons={<ProgramIdlSlot />}
            title={
                <span className="flex min-w-0 flex-1 items-center">
                    <Badge ui="dashkit" variant="info" className="mr-1.5 flex-none">
                        #{index + 1}
                        {childIndex !== undefined ? `.${childIndex + 1}` : ''}
                    </Badge>
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {getProgramName(ix.programId.toBase58(), cluster)}
                    </span>
                    <span className="ml-1.5 flex-none">Instruction</span>
                </span>
            }
        >
            <TableCardBody>
                {notice && (
                    <BaseTable.Row>
                        <BaseTable.Cell colSpan={3} className="!whitespace-normal">
                            {notice}
                        </BaseTable.Cell>
                    </BaseTable.Row>
                )}
                <ProgramField programId={ix.programId} showExtendedInfo />
                <BaseRawDetails ix={ix} />
                {innerCards && innerCards.length > 0 && (
                    <>
                        <BaseTable.SectionRow>
                            <BaseTable.Cell colSpan={3}>Inner Instructions</BaseTable.Cell>
                        </BaseTable.SectionRow>
                        <BaseTable.Row>
                            <BaseTable.Cell colSpan={3}>
                                <div>{innerCards}</div>
                            </BaseTable.Cell>
                        </BaseTable.Row>
                    </>
                )}
            </TableCardBody>
        </CollapsibleCard>
    );
}
