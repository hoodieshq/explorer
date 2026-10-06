// Mock for Node's `fs`: `@codama/dynamic-client` reaches `@codama/dynamic-address-resolution/codegen`, a Node-only
// entry that imports these names. Nothing in the browser calls them, but the production build needs them to exist.
const unavailable = () => {
    throw new Error('fs is not available in the browser');
};

export const existsSync = () => false;
export const readFileSync = unavailable;
export const mkdirSync = unavailable;
export const writeFileSync = unavailable;
const fs = { existsSync, mkdirSync, readFileSync, writeFileSync };
export default fs;
