'use client';

// REVIEW(HOO-1815): lets the inner review try both popup versions from the design menu; remove before the external
// PR, together with the demo version in model/feedback-popup.ts.
import { Button } from '@/app/components/shared/ui/button';
import { DesignMenuOptions, DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

import {
    type FeedbackDemoVersion,
    type FeedbackResponseStyle,
    openFeedbackPopup,
    setFeedbackDemoVersion,
    setFeedbackFakeSend,
    setFeedbackResponseStyle,
    useFeedbackDemoVersion,
    useFeedbackFakeSend,
    useFeedbackResponseStyle,
} from '../model/feedback-popup';
import { FeedbackMotionSection } from './FeedbackMotionSection';

const VERSIONS: { label: string; value: FeedbackDemoVersion }[] = [
    { label: 'A · Pills', value: 'pills' },
    { label: 'B · Cards on desktop', value: 'mixed' },
];

const RESPONSE_STYLES: { label: string; value: FeedbackResponseStyle }[] = [
    { label: 'Toast', value: 'toast' },
    { label: 'On the card', value: 'card' },
    { label: 'Into a toast', value: 'morph' },
    { label: 'Swap content', value: 'swap' },
];

/** The design menu's Feedback sections: every Feedback entry point opens the version picked here and answers a send so. */
export function FeedbackDemoSection() {
    const version = useFeedbackDemoVersion();
    const fakeSend = useFeedbackFakeSend();
    const responseStyle = useFeedbackResponseStyle();

    return (
        <>
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
            <DesignMenuSection title="Feedback send">
                <DesignMenuOptions
                    onChange={setFeedbackResponseStyle}
                    options={RESPONSE_STYLES}
                    value={responseStyle}
                />
                <DesignMenuSwitch checked={fakeSend} label="Pretend to send" onCheckedChange={setFeedbackFakeSend} />
            </DesignMenuSection>
            {responseStyle === 'morph' && <FeedbackMotionSection />}
        </>
    );
}
