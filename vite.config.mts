import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

import tsconfig from './tsconfig.json';

const specWorkspace = (name = 'specs') => ({
    environment: 'jsdom',
    globals: true,
    name,
    server: {
        deps: {
            inline: [
                '@noble',
                'change-case',
                '@react-hook/previous',
                '@solana/kit',
                '@solana/rpc',
                '@solana/rpc-spec',
                '@solana/event-target-impl',
                '@solana/addresses',
            ],
        },
    },
    setupFiles: ['./test-setup.ts'],
    testTimeout: 10000,
});

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: Object.entries(tsconfig.compilerOptions.paths).reduce(
            (acc, [pathKey, [pathValue]]) => ({
                ...acc,
                [pathKey.replace('/*', '')]: path.resolve(
                    tsconfig.compilerOptions.baseUrl,
                    pathValue.replace('/*', '')
                ),
            }),
            {}
        ),
        conditions: ['browser', 'default'],
    },
    test: {
        coverage: {
            provider: 'v8',
        },
        poolOptions: {
            threads: {
                useAtomics: true,
            },
        },
        ...specWorkspace(),
    },
});
