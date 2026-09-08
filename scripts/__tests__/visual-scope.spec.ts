import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), 'visual-scope.sh');

function scope(...paths: string[]): string {
    return execFileSync('bash', [SCRIPT], {
        encoding: 'utf8',
        input: paths.join('\n'),
        stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
}

describe('visual-scope', () => {
    it('should trigger on a component', () => {
        expect(scope('app/components/account/ProgramMultisigCard.tsx')).toBe('touched=true');
    });

    it('should trigger on a story', () => {
        expect(scope('app/components/account/__stories__/ProgramMultisigCard.stories.tsx')).toBe('touched=true');
    });

    it('should trigger on styles, storybook config, design tokens and workspace packages', () => {
        expect(scope('app/styles/globals.css')).toBe('touched=true');
        expect(scope('.storybook/decorators.tsx')).toBe('touched=true');
        expect(scope('tailwind.config.ts')).toBe('touched=true');
        expect(scope('postcss.config.mjs')).toBe('touched=true');
        expect(scope('packages/parsers/src/program-label.ts')).toBe('touched=true');
    });

    it('should ignore specs, mocks and test helpers', () => {
        expect(scope('app/components/account/__tests__/ProgramMultisigCard.spec.tsx')).toBe('touched=false');
        expect(scope('app/components/account/__mocks__/thing.ts')).toBe('touched=false');
        expect(scope('app/features/x/model/parse.spec.ts')).toBe('touched=false');
    });

    it('should trigger on logic that shapes rendered text without holding a component', () => {
        expect(scope('app/utils/format.ts')).toBe('touched=true');
        expect(scope('app/shared/lib/logger.ts')).toBe('touched=true');
        expect(scope('app/entities/domain/lib/sns-name-service.ts')).toBe('touched=true');
        expect(scope('app/features/search/lib/parse-simd-number.ts')).toBe('touched=true');
        expect(scope('app/features/receipt/api/get-tx.ts')).toBe('touched=true');
        expect(scope('app/features/instruction-simulation/model/use-simulation.ts')).toBe('touched=true');
    });

    it('should ignore non-rendering changes', () => {
        expect(scope('README.md')).toBe('touched=false');
        expect(scope('pnpm-lock.yaml')).toBe('touched=false');
        expect(scope('.github/workflows/ci.yaml')).toBe('touched=false');
        // Route handlers and validators serve requests; no story renders them.
        expect(scope('app/api/metadata/proxy/route.ts')).toBe('touched=false');
        expect(scope('app/validators/accounts/token.ts')).toBe('touched=false');
    });

    it('should trigger when one rendered path hides among ignored ones', () => {
        expect(scope('README.md', 'app/components/common/NFTArt.tsx')).toBe('touched=true');
    });

    it('should not trigger on an empty diff', () => {
        expect(scope()).toBe('touched=false');
    });
});
