import type { ReactNode } from 'react';

export interface INavbarProps {
    /** The search bar, injected by the layout so the navbar does not reach for it itself. */
    children?: ReactNode;
}
