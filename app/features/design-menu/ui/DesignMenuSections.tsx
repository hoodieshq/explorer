'use client';

import { ResourcesLayoutDesignSection, ResourcesPreviewDesignSection } from '@/app/shared/ui/resources-layout';
import { SectionActionsDesignSection } from '@/app/shared/ui/section-action';

// REVIEW(home-key-value-cards): what this task's review compares. The menu shell around it is task-independent; a
// client module, because the sections read client-only state and the server layout must not import them.

/** The design menu's content for the home page cards. */
export function DesignMenuSections() {
    return (
        <>
            <SectionActionsDesignSection />
            <ResourcesLayoutDesignSection />
            <ResourcesPreviewDesignSection />
        </>
    );
}
