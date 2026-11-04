import type { ReactNode } from 'react';

/**
 * Wraps an address tab's content. After a navigation Next.js scrolls to the page segment, which here is the tab, if
 * its top is below the screen; on an address page the header and the Overview card stand above the tabs, so it would
 * scroll past them. A box-less wrapper (`display: contents`) gives the tab no rectangle of its own, so Next.js passes
 * the scroll to the address layout and the page opens at its top. Tab links don't scroll at all (`scroll={false}`).
 *
 * The tab's blocks used to be `PageSections` children and took its spacing (`PAGE_SECTION_GAP`, a `space-y`, which
 * also zeroes their bottom margins); inside the wrapper they aren't its children any more, so the wrapper sets the
 * same margins itself.
 */
export function AddressTabContent({ children }: { children: ReactNode }) {
    return (
        <div className="contents [&>:not([hidden])]:mb-0 [&>:not([hidden])]:mt-9 lg:[&>:not([hidden])]:mt-12">
            {children}
        </div>
    );
}
