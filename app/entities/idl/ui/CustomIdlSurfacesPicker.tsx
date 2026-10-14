'use client';

import { useAtom } from 'jotai';

import { DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

import { IDL_SURFACES, type IdlSurface, idlSurfacesAtom, isSurfaceOn } from '../model/custom-idl/idl-surfaces';

// REVIEW(HOO-1971): design-menu section; remove with the design menu.

/** One switch per page that can decode with a custom IDL; a page switched off uses the on-chain IDL. */
export function CustomIdlSurfacesPicker() {
    const [surfaces, setSurfaces] = useAtom(idlSurfacesAtom);
    return (
        <DesignMenuSection title="Custom IDL applies on">
            {IDL_SURFACES.map(surface => (
                <DesignMenuSwitch
                    key={surface}
                    label={LABELS[surface]}
                    checked={isSurfaceOn(surfaces, surface)}
                    onCheckedChange={checked => setSurfaces({ ...surfaces, [surface]: checked })}
                />
            ))}
        </DesignMenuSection>
    );
}

const LABELS: Record<IdlSurface, string> = {
    account: 'Account pages',
    'idl-tab': 'Program IDL tab and Interact',
    inspector: 'Transaction inspector',
    transaction: 'Transaction page',
};
