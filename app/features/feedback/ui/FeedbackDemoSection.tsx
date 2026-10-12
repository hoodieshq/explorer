'use client';

// REVIEW(HOO-1815): lets the inner review try both popup versions from the design menu; remove before the external
// PR, together with the demo version in model/feedback-popup.ts.
import { Button } from '@/app/components/shared/ui/button';
import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import {
    type FeedbackDemoVersion,
    openFeedbackPopup,
    setFeedbackDemoVersion,
    useFeedbackDemoVersion,
} from '../model/feedback-popup';

const VERSIONS: { label: string; value: FeedbackDemoVersion }[] = [
    { label: 'A · Pills', value: 'pills' },
    { label: 'B · Cards on desktop', value: 'mixed' },
];

/** The design menu's Feedback popup section: every Feedback entry point opens the version picked here. */
export function FeedbackDemoSection() {
    const version = useFeedbackDemoVersion();

    return (
        <DesignMenuSection title="Feedback popup">
            <DesignMenuOptions onChange={setFeedbackDemoVersion} options={VERSIONS} value={version} />
            <Button
                className="cursor-pointer"
                onClick={event => {
                    // The design menu is a popover layered above dialogs (z 1202 against the popup's 50); Escape is
                    // what Radix closes it on, so the popup opens clear of it.
                    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
                    openFeedbackPopup(event.currentTarget);
                }}
                size="sm"
                variant="outline"
            >
                Open popup
            </Button>
        </DesignMenuSection>
    );
}
