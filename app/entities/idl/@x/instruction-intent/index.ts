// Cross-entity public API (FSD `@x` notation): the slice of the `idl` entity that `instruction-intent` may consume.
// Intents read the shared `useProgramIdls` resolution and name programs and instructions via `buildProgramIdlNames`.
export { useProgramIdls } from '../../model/use-program-idls';
export { buildProgramIdlNames } from '../../model/instruction-name-table';
