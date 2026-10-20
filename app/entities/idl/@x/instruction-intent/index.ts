// Cross-entity public API (FSD `@x` notation): the slice of the `idl` entity that the
// `instruction-intent` entity is allowed to consume. Intents read the shared `useProgramIdls` resolution and name programs via `buildProgramName`.
export { useProgramIdls } from '../../model/use-program-idls';
export { buildProgramName } from '../../model/instruction-name-table';
export type { SupportedIdl } from '../../lib/types';
