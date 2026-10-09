'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useState } from 'react';

// Loaded on first open: the footer is on every page, and the catalog is rarely opened.
const CustomIdlCatalog = dynamic(() => import('./CustomIdlCatalog').then(m => m.CustomIdlCatalog), { ssr: false });

/** Opens the catalog of custom IDLs from inline content, such as a footer link. */
export function CustomIdlCatalogTrigger({ children, className }: { children: ReactNode; className?: string }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" className={className} onClick={() => setOpen(true)}>
                {children}
            </button>
            {open && <CustomIdlCatalog open onOpenChange={setOpen} />}
        </>
    );
}
