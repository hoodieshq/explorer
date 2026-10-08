'use client';

import type { ReactNode } from 'react';

import { isFeedbackWidgetEnabled } from '../env';
import { openFeedbackPopup } from '../model/feedback-popup';

export interface FeedbackTriggerProps {
    children: ReactNode;
    className?: string;
}

/**
 * Opens the feedback popup from inline content, such as the footer link or the burger menu item. The popup
 * lives in FeedbackWidget, so this only asks it to open, growing out of the clicked element. It needs the
 * widget flag alone: without a Sentry DSN the popup still offers the GitHub links.
 */
export function FeedbackTrigger({ children, className }: FeedbackTriggerProps) {
    if (!isFeedbackWidgetEnabled()) return undefined;

    return (
        <button className={className} onClick={event => openFeedbackPopup(event.currentTarget)} type="button">
            {children}
        </button>
    );
}
