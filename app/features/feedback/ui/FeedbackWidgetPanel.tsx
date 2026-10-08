'use client';

import { useEffect, useRef, useState } from 'react';

import { BUG_REPORT_ISSUES_URL, FEEDBACK_ISSUES_URL, isFeedbackEnabled } from '../env';
import {
    type FeedbackPopupLayout,
    getFeedbackDemoVersion,
    openFeedbackPopup,
    resolveFeedbackPopupLayout,
    takeFeedbackPopupRequest,
    useFeedbackPopupRequest,
} from '../model/feedback-popup';
import { useFeedbackForm } from '../model/use-feedback-form';
import { BaseFeedbackWidget } from './BaseFeedbackWidget';
import { FeedbackPopup } from './FeedbackPopup';

/** The floating Feedback button and the one popup every entry point opens. */
export function FeedbackWidgetPanel() {
    const { isSubmitting, submit } = useFeedbackForm();
    const triggerRef = useRef<HTMLButtonElement>(null);
    // One stable ref for the popup's origin, swapped per request: a new ref object would re-create the popup's
    // callback ref and replay its opening animation.
    const originRef = useRef<HTMLElement | null>(null);
    const [open, setOpen] = useState(false);
    const [layout, setLayout] = useState<FeedbackPopupLayout>('pills');
    const request = useFeedbackPopupRequest();

    useEffect(() => {
        if (!request) return;
        takeFeedbackPopupRequest();
        originRef.current = request.origin;
        setLayout(resolveFeedbackPopupLayout(getFeedbackDemoVersion()));
        setOpen(true);
    }, [request]);

    return (
        <>
            {/* Below lg the floating button would overlap page controls, so the burger menu and the footer offer
                feedback instead. From lg, a zero-height sticky anchor at the end of the content column: it rides
                16px above the viewport bottom while the column runs on, and comes to rest at the column's end,
                above the footer. The button hangs from it, so the anchor takes no space in the flow. */}
            <div className="sticky bottom-4 z-40 hidden h-0 lg:block">
                <div className="absolute bottom-0 right-4 flex">
                    <BaseFeedbackWidget
                        ref={triggerRef}
                        aria-expanded={open}
                        aria-haspopup="dialog"
                        onClick={() => openFeedbackPopup(triggerRef.current)}
                        // The popup grows out of the button and lands back on it, so the button steps aside meanwhile.
                        style={{ opacity: open && originRef.current === triggerRef.current ? 0 : 1 }}
                    />
                </div>
            </div>
            <FeedbackPopup
                bugReportUrl={BUG_REPORT_ISSUES_URL}
                ideasUrl={FEEDBACK_ISSUES_URL}
                isSubmitting={isSubmitting}
                layout={layout}
                onOpenChange={setOpen}
                onSubmitFeedback={isFeedbackEnabled() ? submit : undefined}
                open={open}
                originRef={originRef}
            />
        </>
    );
}
