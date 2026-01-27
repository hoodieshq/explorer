import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserANSDomains } from '@/app/utils/ans-domains';
import { useUserDomains } from '@/app/utils/name-service';

import { usePrimaryDomain } from '../use-primary-domain';

vi.mock('@/app/utils/name-service', () => ({ useUserDomains: vi.fn() }));
vi.mock('@/app/utils/ans-domains', () => ({ useUserANSDomains: vi.fn() }));

const VALID_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('usePrimaryDomain', () => {
    beforeEach(() => {
        vi.mocked(useUserDomains).mockReturnValue([null, false] as ReturnType<typeof useUserDomains>);
        vi.mocked(useUserANSDomains).mockReturnValue([null, false] as ReturnType<typeof useUserANSDomains>);
    });

    it('returns undefined when both SOL and ANS domains are null', () => {
        const { result } = renderHook(() => usePrimaryDomain(VALID_ADDRESS));
        expect(result.current).toBeUndefined();
    });

    it('returns undefined when both SOL and ANS domains are empty arrays', () => {
        vi.mocked(useUserDomains).mockReturnValue([[], false] as ReturnType<typeof useUserDomains>);
        vi.mocked(useUserANSDomains).mockReturnValue([[], false] as ReturnType<typeof useUserANSDomains>);

        const { result } = renderHook(() => usePrimaryDomain(VALID_ADDRESS));
        expect(result.current).toBeUndefined();
    });

    it('returns first SOL domain when only SOL domains exist (sorted by name)', () => {
        vi.mocked(useUserDomains).mockReturnValue([
            [
                { address: {} as never, name: 'alex.sol' },
                { address: {} as never, name: 'bob.sol' },
            ],
            false,
        ] as ReturnType<typeof useUserDomains>);

        const { result } = renderHook(() => usePrimaryDomain(VALID_ADDRESS));
        expect(result.current).toBe('alex.sol');
    });

    it('returns first ANS domain when only ANS domains exist (sorted by name)', () => {
        vi.mocked(useUserANSDomains).mockReturnValue([
            [
                { address: {} as never, name: 'alice.abc' },
                { address: {} as never, name: 'charlie.abc' },
            ],
            false,
        ] as ReturnType<typeof useUserANSDomains>);

        const { result } = renderHook(() => usePrimaryDomain(VALID_ADDRESS));
        expect(result.current).toBe('alice.abc');
    });

    it('prefers SOL domain over ANS when both exist', () => {
        vi.mocked(useUserDomains).mockReturnValue([[{ address: {} as never, name: 'user.sol' }], false] as ReturnType<
            typeof useUserDomains
        >);
        vi.mocked(useUserANSDomains).mockReturnValue([
            [{ address: {} as never, name: 'user.abc' }],
            false,
        ] as ReturnType<typeof useUserANSDomains>);

        const { result } = renderHook(() => usePrimaryDomain(VALID_ADDRESS));
        expect(result.current).toBe('user.sol');
    });

    it('returns ANS domain when SOL is empty and ANS has domains', () => {
        vi.mocked(useUserDomains).mockReturnValue([[], false] as ReturnType<typeof useUserDomains>);
        vi.mocked(useUserANSDomains).mockReturnValue([
            [{ address: {} as never, name: 'fallback.abc' }],
            false,
        ] as ReturnType<typeof useUserANSDomains>);

        const { result } = renderHook(() => usePrimaryDomain(VALID_ADDRESS));
        expect(result.current).toBe('fallback.abc');
    });

    it('passes address through to underlying hooks', () => {
        renderHook(() => usePrimaryDomain(VALID_ADDRESS));
        expect(useUserDomains).toHaveBeenCalledWith(VALID_ADDRESS);
        expect(useUserANSDomains).toHaveBeenCalledWith(VALID_ADDRESS);
    });
});
