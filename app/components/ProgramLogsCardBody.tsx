import { TableCardBody, type TableCardBodyProps } from '@components/common/TableCardBody';
import {
    CUSTOM_IDL_ROW_EDGE,
    CUSTOM_IDL_ROW_TINT,
    customIdlHighlight,
    holdRoundedAncestorClip,
    useAnchorProgram,
    useCustomIdlHighlightVariant,
} from '@entities/idl';
import { ParsedMessage, PublicKey, TransactionInstruction, VersionedMessage } from '@solana/web3.js';
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
import React, { type CSSProperties, type RefObject, useEffect, useRef, useState } from 'react';
import { ChevronsUp } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { fromBase64, toBuffer } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { BaseTable } from '@/app/shared/ui/Table';

// REVIEW(HOO-1971): a tinted line spans the log block's width, so consecutive lines read as one band.
const logLineVariants = cva('', {
    variants: {
        tinted: {
            false: '',
            true: 'self-stretch',
        },
    },
});

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
    anchorProgram: any;
}) {
    // Try to get the program name as a string
    const nativeLabel = programLabel(programId.toBase58(), cluster);
    const anchorLabel = anchorProgram ? getAnchorProgramName(anchorProgram) : undefined;
    const programNameStr = nativeLabel || anchorLabel;

    // If we have a program name string, we can intelligently format it
    if (programNameStr) {
        // Check if the program name ends with "Program"
        if (programNameStr.endsWith(' Program')) {
            // Replace "Program" with instruction name
            const baseName = programNameStr.slice(0, -8); // Remove " Program"
            return (
                <>
                    {baseName} {instructionName}
                </>
            );
        } else {
            // Just append instruction name
            return (
                <>
                    {programNameStr} {instructionName}
                </>
            );
        }
    }

    // Fallback to component-based rendering
    return (
        <>
            <ProgramName programId={programId} cluster={cluster} url={url} /> {instructionName}
        </>
    );
}

export function ProgramLogsCardBody({
    message,
    logs,
    cluster,
    url,
    className,
    density,
}: {
    message: VersionedMessage | ParsedMessage;
    logs: InstructionLogs[];
    cluster: Cluster;
    url: string;
    className?: string;
    /** Passed through to the underlying table — `"dense"` gives the compact rows the inspector panel uses. */
    density?: TableCardBodyProps['density'];
}) {
    let logIndex = 0;
    let instructionProgramIds: PublicKey[];
    let instructions: any[];

    if ('compiledInstructions' in message) {
        instructionProgramIds = message.compiledInstructions.map(ix => {
            return message.staticAccountKeys[ix.programIdIndex];
        });
        instructions = message.compiledInstructions;
    } else {
        instructionProgramIds = message.instructions.map(ix => ix.programId);
        instructions = message.instructions;
    }

    return (
        <TableCardBody className={className} density={density}>
            {instructionProgramIds.map((programId, index) => {
                const programAddress = programId.toBase58();
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
                        programId={programId}
                        programLogs={programLogs}
                        url={url}
                        message={message}
                        instruction={instructions[index]}
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
    programId,
    programLogs,
    url,
    message,
    instruction,
}: {
    badgeColor: string;
    cluster: Cluster;
    index: number;
    programId: PublicKey;
    programLogs?: InstructionLogs;
    url: string;
    message: VersionedMessage | ParsedMessage;
    instruction: any;
}) {
    const pathname = usePathname();
    const anchorPath = useClusterPath({ pathname: `${pathname}#${getInstructionCardScrollAnchorId([index + 1])}` });
    const { program: anchorProgram, isCustomIdl } = useAnchorProgram(programId.toString(), url, cluster);
    // REVIEW(HOO-1971): the row highlight variant tints the title and the lines the instruction's own program
    // logged (depth 1), full width; its CPIs' lines belong to other programs and stay as they are.
    const highlightVariant = useCustomIdlHighlightVariant();
    const isRowTinted = isCustomIdl && highlightVariant === 'row';
    const cellRef = useRef<HTMLTableCellElement>(null);
    const logsRef = useRef<HTMLDivElement>(null);
    const insets = useTintInsets(cellRef, logsRef, isRowTinted, Boolean(programLogs));
    const lastLogIndex = (programLogs?.logs.length ?? 0) - 1;

    // Try to get instruction name from IDL if available
    let instructionName = 'Instruction';

    if (anchorProgram) {
        try {
            let txInstruction: TransactionInstruction | undefined;

            if ('compiledInstructions' in message) {
                // VersionedMessage with compiledInstructions
                const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } =
                    message.header;

                const accounts = instruction.accountKeyIndexes.map((accountIndex: number) => {
                    const pubkey = message.staticAccountKeys[accountIndex];

                    // Determine if account is signer and writable based on message header
                    let isSigner = false;
                    let isWritable = true;

                    if (accountIndex < numRequiredSignatures) {
                        isSigner = true;
                        if (accountIndex >= numRequiredSignatures - numReadonlySignedAccounts) {
                            isWritable = false;
                        }
                    } else if (accountIndex >= message.staticAccountKeys.length - numReadonlyUnsignedAccounts) {
                        isWritable = false;
                    }

                    return {
                        isSigner,
                        isWritable,
                        pubkey,
                    };
                });

                txInstruction = new TransactionInstruction({
                    data: toBuffer(instruction.data),
                    keys: accounts,
                    programId,
                });
            } else if ('instructions' in message && !('parsed' in instruction)) {
                // ParsedMessage with PartiallyDecodedInstruction
                const keys = instruction.accounts.map((account: PublicKey) => {
                    const accountKey = message.accountKeys.find(({ pubkey }) => pubkey.equals(account));
                    return {
                        isSigner: accountKey?.signer || false,
                        isWritable: accountKey?.writable || false,
                        pubkey: account,
                    };
                });

                txInstruction = new TransactionInstruction({
                    data: toBuffer(fromBase64(instruction.data)),
                    keys,
                    programId,
                });
            }

            if (txInstruction) {
                const decodedName = getAnchorNameForInstruction(txInstruction, anchorProgram);
                if (decodedName) {
                    instructionName = camelToTitleCase(decodedName);
                }
            }
        } catch (error) {
            Logger.error(error);
        }
    }

    return (
        <BaseTable.Row data-ix-index={index}>
            <BaseTable.Cell ref={cellRef}>
                <Link
                    className="flex items-center"
                    href={anchorPath}
                    style={
                        isRowTinted
                            ? bleedTint({
                                  bottom: programLogs ? 0 : insets?.cell.bottom,
                                  left: insets?.cell.left,
                                  right: insets?.cell.right,
                                  top: insets?.cell.top,
                              })
                            : undefined
                    }
                >
                    {/* badgeColor='white' falls through to a plain `.badge` (no bg-white-soft is defined in dashkit) — same as legacy. */}
                    <Badge
                        ui="dashkit"
                        variant={badgeColor === 'success' || badgeColor === 'warning' ? badgeColor : 'default'}
                        className="mr-1.5"
                    >
                        #{index + 1}
                    </Badge>
                    <span
                        className={customIdlHighlight({
                            active: isCustomIdl && !isRowTinted,
                            className: 'text-dk-white',
                        })}
                    >
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
                    <div
                        ref={logsRef}
                        className="flex flex-col items-start whitespace-pre-wrap break-all p-1.5 font-mono"
                    >
                        {programLogs.logs.map((log, key) => {
                            const isTinted = isRowTinted && log.depth === 1;
                            // A tinted line reaches the card's sides, and the first and the last also cover the
                            // block's padding above and below them, so the tint has no gaps up to the card edge.
                            const style = isTinted
                                ? bleedTint(
                                      insets
                                          ? {
                                                bottom:
                                                    key === lastLogIndex ? insets.logs.bottom + insets.cell.bottom : 0,
                                                left: insets.logs.left + insets.cell.left,
                                                right: insets.logs.right + insets.cell.right,
                                                top: key === 0 ? insets.logs.top : 0,
                                            }
                                          : {},
                                  )
                                : undefined;
                            return (
                                <span key={key} className={logLineVariants({ tinted: isTinted })} style={style}>
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

type Insets = { top: number; right: number; bottom: number; left: number };

/**
 * REVIEW(HOO-1971): the paddings a tinted title or log line spreads over to reach the card's edges, read from
 * the rendered cell and log block because the table variant owns the cell padding. Clips the rounded card
 * while tinted, so a tint at its bottom edge stays inside the corners.
 */
function useTintInsets(
    cellRef: RefObject<HTMLTableCellElement | null>,
    logsRef: RefObject<HTMLDivElement | null>,
    active: boolean,
    hasLogs: boolean,
): { cell: Insets; logs: Insets } | undefined {
    const [insets, setInsets] = useState<{ cell: Insets; logs: Insets }>();
    useEffect(() => {
        const cell = cellRef.current;
        if (!active || !cell) {
            setInsets(undefined);
            return;
        }
        const zero = { bottom: 0, left: 0, right: 0, top: 0 };
        setInsets({ cell: readPadding(cell), logs: logsRef.current ? readPadding(logsRef.current) : zero });
        return holdRoundedAncestorClip(cell);
    }, [active, hasLogs, cellRef, logsRef]);
    return insets;
}

function readPadding(element: HTMLElement): Insets {
    const style = getComputedStyle(element);
    return {
        bottom: parseFloat(style.paddingBottom) || 0,
        left: parseFloat(style.paddingLeft) || 0,
        right: parseFloat(style.paddingRight) || 0,
        top: parseFloat(style.paddingTop) || 0,
    };
}

// Pulls the element over the given paddings with negative margins and gives the space back as its own padding,
// so its background covers them while its text stays in place.
function bleedTint({ top = 0, right = 0, bottom = 0, left = 0 }: Partial<Insets>): CSSProperties {
    return {
        backgroundColor: CUSTOM_IDL_ROW_TINT,
        backgroundImage: CUSTOM_IDL_ROW_EDGE,
        marginBottom: -bottom,
        marginLeft: -left,
        marginRight: -right,
        marginTop: -top,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
        paddingTop: top,
    };
}
