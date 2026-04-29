/**
 * Canonical English labels for the program-metadata SDK's enums.
 * Lives in lib/ rather than ui/ because these names ("UTF-8", "Gzip", "Set Authority")
 * aren't a UI choice — they're the standard names for the SDK values.
 */

import { InstructionType } from './types';

const INSTRUCTION_LABELS: Record<InstructionType, string> = {
    [InstructionType.Allocate]: 'Allocate',
    [InstructionType.Close]: 'Close',
    [InstructionType.Extend]: 'Extend',
    [InstructionType.Initialize]: 'Initialize',
    [InstructionType.SetAuthority]: 'Set Authority',
    [InstructionType.SetData]: 'Set Data',
    [InstructionType.SetImmutable]: 'Set Immutable',
    [InstructionType.Trim]: 'Trim',
    [InstructionType.Write]: 'Write',
};

/** Past-tense one-liner for events that don't carry per-event detail to render. */
const INSTRUCTION_SUMMARIES: Partial<Record<InstructionType, string>> = {
    [InstructionType.Allocate]: 'Buffer allocated',
    [InstructionType.Close]: 'Account closed',
    [InstructionType.Extend]: 'Account extended',
    [InstructionType.SetImmutable]: 'Locked permanently',
    [InstructionType.Trim]: 'Account trimmed',
};

const ENCODING_LABELS: Record<number, string> = { 0: 'None', 1: 'UTF-8', 2: 'Base58', 3: 'Base64' };
const COMPRESSION_LABELS: Record<number, string> = { 0: 'None', 1: 'Gzip', 2: 'Zlib' };
const FORMAT_LABELS: Record<number, string> = { 0: 'None', 1: 'JSON', 2: 'YAML', 3: 'TOML' };
const DATA_SOURCE_LABELS: Record<number, string> = { 0: 'Direct', 1: 'URL', 2: 'External' };

export function getInstructionLabel(type: InstructionType): string {
    return INSTRUCTION_LABELS[type];
}

export function getInstructionSummary(type: InstructionType): string | undefined {
    return INSTRUCTION_SUMMARIES[type];
}

export function getEncodingLabel(value: number): string {
    return ENCODING_LABELS[value] ?? `Unknown (${value})`;
}

export function getCompressionLabel(value: number): string {
    return COMPRESSION_LABELS[value] ?? `Unknown (${value})`;
}

export function getFormatLabel(value: number): string {
    return FORMAT_LABELS[value] ?? `Unknown (${value})`;
}

export function getDataSourceLabel(value: number): string {
    return DATA_SOURCE_LABELS[value] ?? `Unknown (${value})`;
}
