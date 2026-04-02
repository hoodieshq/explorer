import { InstructionType } from './types';

export const PROGRAM_METADATA_PROGRAM_ID = 'ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S';

export const MAX_SIGNATURES = 10_000;
export const SIGNATURES_BATCH_SIZE = 1000;
export const TX_FETCH_CONCURRENCY = 50;

export const INSTRUCTION_LABELS: Record<InstructionType, string> = {
    [InstructionType.Write]: 'Write',
    [InstructionType.Initialize]: 'Initialize',
    [InstructionType.SetAuthority]: 'Set Authority',
    [InstructionType.SetData]: 'Set Data',
    [InstructionType.SetImmutable]: 'Set Immutable',
    [InstructionType.Trim]: 'Trim',
    [InstructionType.Close]: 'Close',
    [InstructionType.Allocate]: 'Allocate',
    [InstructionType.Extend]: 'Extend',
};

export type BadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'secondary';

export const INSTRUCTION_BADGE_VARIANT: Record<InstructionType, BadgeVariant> = {
    [InstructionType.Write]: 'info',
    [InstructionType.Initialize]: 'success',
    [InstructionType.SetAuthority]: 'warning',
    [InstructionType.SetData]: 'info',
    [InstructionType.SetImmutable]: 'destructive',
    [InstructionType.Trim]: 'warning',
    [InstructionType.Close]: 'destructive',
    [InstructionType.Allocate]: 'secondary',
    [InstructionType.Extend]: 'secondary',
};

export const INSTRUCTION_DOT_COLOR: Record<InstructionType, string> = {
    [InstructionType.Write]: 'e-bg-teal-400',
    [InstructionType.Initialize]: 'e-bg-green-400',
    [InstructionType.SetAuthority]: 'e-bg-orange-400',
    [InstructionType.SetData]: 'e-bg-teal-400',
    [InstructionType.SetImmutable]: 'e-bg-red-400',
    [InstructionType.Trim]: 'e-bg-orange-400',
    [InstructionType.Close]: 'e-bg-red-400',
    [InstructionType.Allocate]: 'e-bg-neutral-400',
    [InstructionType.Extend]: 'e-bg-neutral-400',
};

export const ENCODING_LABELS: Record<number, string> = {
    0: 'None',
    1: 'UTF-8',
    2: 'Base58',
    3: 'Base64',
};

export const COMPRESSION_LABELS: Record<number, string> = {
    0: 'None',
    1: 'Gzip',
    2: 'Zlib',
};

export const FORMAT_LABELS: Record<number, string> = {
    0: 'None',
    1: 'JSON',
    2: 'YAML',
    3: 'TOML',
};

export const DATA_SOURCE_LABELS: Record<number, string> = {
    0: 'Direct',
    1: 'URL',
    2: 'External',
};
