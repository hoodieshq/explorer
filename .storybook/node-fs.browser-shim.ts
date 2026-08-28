// `@codama/dynamic-address-resolution/codegen` (reached from @codama/dynamic-client, even via its browser entry)
// has no browser export condition, so its named `fs` imports land in the Storybook preview bundle where rollup
// rejects them against Vite's externalized stub — `next build` survives the same import only because webpack
// resolves node builtins to `false` for client bundles. Throwing is safe: those fs calls only write generated
// files, which no preview code path asks for.
function unavailable(name: string): never {
    throw new Error(`fs.${name} is not available in the browser`);
}

export const existsSync = () => unavailable('existsSync');
export const readFileSync = () => unavailable('readFileSync');
export const writeFileSync = () => unavailable('writeFileSync');
export const mkdirSync = () => unavailable('mkdirSync');

const fs = { existsSync, mkdirSync, readFileSync, writeFileSync };

export default fs;
