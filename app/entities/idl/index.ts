export type {
    FormattedIdl,
    FieldType,
    StructField,
    InstructionAccountData,
    PdaData,
    ArgField,
    InstructionData,
    NestedInstructionAccountsData,
} from './model/formatters/formatted-idl';
export { getIdlBadgeLabel, getIdlProgramVersion, getIdlSpec, getIdlStandard, getIdlVersion } from './model/idl-version';
export { type AnchorIdl, type CodamaIdl, type IdlStandard, type SupportedIdl } from './lib/types';
export { type ProgramIdlPair } from './api/types';
export { isIdlProgramIdMismatch, isInteractiveIdlSupported } from './model/interactive-idl';
export { IdlVariant } from './model/idl-variant';

// Per-program names built from each program's IDL — a display name plus an instruction-name resolver
// matched by discriminator (no Borsh decode) — used to label transaction rows the RPC leaves as
// "Unknown Program" / "Unknown Instruction". One of the name sources `transaction-data` tries, not the
// whole of instruction naming.
export { useProgramIdlNames } from './model/use-program-idl-names';
export type { InstructionNameResolver, ProgramIdlNames } from './model/use-program-idl-names';
export { buildProgramName } from './model/instruction-name-table';

export { getIdlSpecType as getDisplayIdlSpecType } from './model/converters/convert-display-idl';
export { formatDisplayIdl, formatSerdeIdl, getFormattedIdl } from './model/formatters/format';
export { useFormatAnchorIdl } from './model/anchor/use-format-anchor-idl';
export { useAnchorProgram } from './model/anchor/use-anchor-program';
export { getProvider } from './model/anchor/anchor-provider';
export { useProgramIdls, type ProgramIdls } from './model/use-program-idls';
export { useFormatCodamaIdl } from './model/use-format-codama-idl';
export { getIdlSpecType } from './model/converters/convert-legacy-idl';

// A user-supplied IDL per program, stored in the browser. `useProgramIdls` applies the selection, so
// consumers only read `isCustomIdl` to highlight what they render from it.
export {
    type CustomIdl,
    type IdlSourceSelection,
    type ProgramIdlPreference,
} from './model/custom-idl/custom-idl-store';
export {
    parseCustomIdl,
    parseDeclaredProgramAddress,
    type CustomIdlParseResult,
} from './model/custom-idl/parse-custom-idl';
export {
    useAddCustomIdl,
    useProgramIdlPreference,
    useProgramIdlPreferences,
} from './model/custom-idl/use-program-idl-preference';
export { customIdlHighlight } from './ui/custom-idl-highlight';
export { ProgramIdlSelector } from './ui/ProgramIdlSelector';
export { CustomIdlMarkProvider, ProgramIdlSlot, ProgramIdlSlotProvider } from './ui/ProgramIdlSlot';
export {
    getOnChainIdlSourceOptions,
    getSelectedIdlSourceOption,
    type IdlSourceOption,
    toIdlSourceSelection,
} from './model/custom-idl/idl-source-options';
export { CustomIdlUploadDialog } from './ui/CustomIdlUploadDialog';
export { CustomIdlForm, CustomIdlIntro } from './ui/CustomIdlForm';
