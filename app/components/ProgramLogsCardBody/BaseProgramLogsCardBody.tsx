import { TableCardBody, type TableCardBodyProps } from '@components/common/TableCardBody';
import type { Program } from '@coral-xyz/anchor';
import { useAnchorProgram } from '@entities/idl';
import type { PublicKey } from '@solana/web3.js';
import { getAnchorNameForInstruction, getAnchorProgramName } from '@utils/anchor';
import { Cluster } from '@utils/cluster';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';
import { camelToTitleCase } from '@utils/index';
import { InstructionLogs } from '@utils/program-logs';
import { ProgramName } from '@utils/program-name';
import { programLabel } from '@utils/tx';
import { useClusterPath } from '@utils/url';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { ChevronsUp } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Logger } from '@/app/shared/lib/logger';
import { BaseTable } from '@/app/shared/ui/Table';

/** One instruction of the logs card, in transaction order. */
export type ProgramLogsInstruction = {
    programId: PublicKey;
    /** Absent for an instruction the RPC already parsed, which needs no Anchor decoding. */
    data?: Uint8Array;
};

export type BaseProgramLogsCardBodyProps = {
    instructions: ProgramLogsInstruction[];
    logs: InstructionLogs[];
    cluster: Cluster;
    url: string;
    className?: string;
    /** Passed through to the underlying table. `"dense"` gives the compact rows the inspector panel uses. */
    density?: TableCardBodyProps['density'];
};

// Matches the compiled dashkit `.text-*` colors the legacy `text-${log.style}` template resolved to (dark theme).
const logTextVariants = cva('', {
    variants: {
        variant: {
            info: 'text-dk-info',
            muted: 'text-dk-gray-700',
            success: 'text-dk-success-on-dark',
            warning: 'text-dk-warning-on-dark',
        },
    },
});

const NATIVE_PROGRAMS_MISSING_INVOKE_LOG: string[] = [
    'AddressLookupTab1e1111111111111111111111111',
    'ZkTokenProof1111111111111111111111111111111',
    'BPFLoader1111111111111111111111111111111111',
    'BPFLoader2111111111111111111111111111111111',
    'BPFLoaderUpgradeab1e11111111111111111111111',
];

function ProgramNameWithInstruction({
    programId,
    cluster,
    url,
    instructionName,
    anchorProgram,
}: {
    programId: PublicKey;
    cluster: Cluster;
    url: string;
    instructionName: string;
    anchorProgram: Program | null;
}) {
    const nativeLabel = programLabel(programId.toBase58(), cluster);
    const anchorLabel = anchorProgram ? getAnchorProgramName(anchorProgram) : undefined;
    const programNameStr = nativeLabel || anchorLabel;

    if (programNameStr) {
        // "System Program" with "Transfer" reads as "System Transfer"
        if (programNameStr.endsWith(' Program')) {
            const baseName = programNameStr.slice(0, -' Program'.length);
            return (
                <>
                    {baseName} {instructionName}
                </>
            );
        } else {
            return (
                <>
                    {programNameStr} {instructionName}
                </>
            );
        }
    }

    return (
        <>
            <ProgramName programId={programId} cluster={cluster} url={url} /> {instructionName}
        </>
    );
}

export function BaseProgramLogsCardBody({
    instructions,
    logs,
    cluster,
    url,
    className,
    density,
}: BaseProgramLogsCardBodyProps) {
    let logIndex = 0;

    return (
        <TableCardBody className={className} density={density}>
            {instructions.map((instruction, index) => {
                const programAddress = instruction.programId.toBase58();
                let programLogs: InstructionLogs | undefined = logs[logIndex];
                if (programLogs?.invokedProgram === programAddress) {
                    logIndex++;
                } else if (
                    programLogs?.invokedProgram === null &&
                    programLogs.logs.length > 0 &&
                    NATIVE_PROGRAMS_MISSING_INVOKE_LOG.includes(programAddress)
                ) {
                    logIndex++;
                } else {
                    programLogs = undefined;
                }

                let badgeColor = 'white';
                if (programLogs) {
                    badgeColor = programLogs.failed ? 'warning' : 'success';
                }

                return (
                    <ProgramLogRow
                        badgeColor={badgeColor}
                        cluster={cluster}
                        key={index}
                        index={index}
                        instruction={instruction}
                        programLogs={programLogs}
                        url={url}
                    />
                );
            })}
        </TableCardBody>
    );
}

function ProgramLogRow({
    badgeColor,
    cluster,
    index,
    instruction,
    programLogs,
    url,
}: {
    badgeColor: string;
    cluster: Cluster;
    index: number;
    instruction: ProgramLogsInstruction;
    programLogs?: InstructionLogs;
    url: string;
}) {
    const pathname = usePathname();
    const anchorPath = useClusterPath({ pathname: `${pathname}#${getInstructionCardScrollAnchorId([index + 1])}` });
    const { programId } = instruction;
    const { program: anchorProgram } = useAnchorProgram(programId.toString(), url, cluster);

    let instructionName = 'Instruction';
    if (anchorProgram && instruction.data) {
        try {
            const decodedName = getAnchorNameForInstruction(instruction.data, anchorProgram);
            if (decodedName) {
                instructionName = camelToTitleCase(decodedName);
            }
        } catch (error) {
            Logger.error(error);
        }
    }

    return (
        <BaseTable.Row data-ix-index={index}>
            <BaseTable.Cell>
                <Link className="flex items-center" href={anchorPath}>
                    {/* badgeColor='white' falls through to a plain `.badge`, because dashkit defines no bg-white-soft. */}
                    <Badge
                        ui="dashkit"
                        variant={badgeColor === 'success' || badgeColor === 'warning' ? badgeColor : 'default'}
                        className="mr-1.5"
                    >
                        #{index + 1}
                    </Badge>
                    <span className="text-dk-white">
                        <ProgramNameWithInstruction
                            programId={programId}
                            cluster={cluster}
                            url={url}
                            instructionName={instructionName}
                            anchorProgram={anchorProgram}
                        />
                    </span>
                    <ChevronsUp className="m-1.5 cursor-pointer" size={13} />
                </Link>
                {programLogs && (
                    <div className="flex flex-col items-start whitespace-pre-wrap break-all p-1.5 font-mono">
                        {programLogs.logs.map((log, key) => {
                            return (
                                <span key={key}>
                                    <span className="text-dk-gray-700">{log.prefix}</span>
                                    <span className={logTextVariants({ variant: log.style })}>{log.text}</span>
                                </span>
                            );
                        })}
                    </div>
                )}
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
