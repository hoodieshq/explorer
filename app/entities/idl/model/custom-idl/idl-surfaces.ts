import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { usePathname } from 'next/navigation';

// REVIEW(HOO-1971): review-only switch that turns the custom IDL off page by page; remove with the design menu.

/** The pages that can decode with a custom IDL. */
export type IdlSurface = 'transaction' | 'inspector' | 'idl-tab' | 'account';

export const IDL_SURFACES: readonly IdlSurface[] = ['transaction', 'inspector', 'idl-tab', 'account'];

/** Until a reviewer flips a switch, the custom IDL applies on the IDL tab only. */
const DEFAULT_SURFACES: Record<IdlSurface, boolean> = {
    account: false,
    'idl-tab': true,
    inspector: false,
    transaction: false,
};

/** The switches a reviewer flipped; pages switched off keep the on-chain IDL even where a custom IDL is selected. */
export const idlSurfacesAtom = atomWithStorage<Partial<Record<IdlSurface, boolean>>>('hoo-1971:idl-surfaces', {});

export function isSurfaceOn(surfaces: Partial<Record<IdlSurface, boolean>>, surface: IdlSurface): boolean {
    return surfaces[surface] ?? DEFAULT_SURFACES[surface];
}

/** Whether the custom IDL may apply on the current page. Pages outside `IDL_SURFACES` always allow it. */
export function useCustomIdlAllowedHere(): boolean {
    const surfaces = useAtomValue(idlSurfacesAtom);
    const surface = surfaceOf(usePathname() ?? '');
    return surface === undefined || isSurfaceOn(surfaces, surface);
}

export function surfaceOf(pathname: string): IdlSurface | undefined {
    const [section, id, tab] = pathname.split('/').filter(Boolean);
    if (section === 'tx') return id === 'inspector' || tab === 'inspect' ? 'inspector' : 'transaction';
    if (section === 'address') return tab === 'idl' ? 'idl-tab' : 'account';
    return undefined;
}
