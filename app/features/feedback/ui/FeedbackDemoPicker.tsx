'use client';

// REVIEW(HOO-1815): lets the inner review try both popup versions; remove before the external PR, together
// with the demo version in model/feedback-popup.ts and its hook-in on the transaction page.
import { Button } from '@/app/components/shared/ui/button';
import { cn } from '@/app/components/shared/utils';

import {
    type FeedbackDemoVersion,
    openFeedbackPopup,
    setFeedbackDemoVersion,
    useFeedbackDemoVersion,
} from '../model/feedback-popup';

const VERSIONS: { label: string; version: FeedbackDemoVersion }[] = [
    { label: 'A · Pills', version: 'pills' },
    { label: 'B · Pills on mobile, cards on desktop', version: 'mixed' },
];

/** Picking a version also opens it, from the button, as every Feedback entry point then will. */
export function FeedbackDemoPicker() {
    const demoVersion = useFeedbackDemoVersion();

    return (
        <section className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-neutral-700 p-3">
            <span className="text-xs uppercase text-neutral-400">Demo popup</span>
            {VERSIONS.map(({ label, version }) => {
                const selected = version === demoVersion;
                return (
                    <Button
                        key={version}
                        aria-pressed={selected}
                        className={cn('cursor-pointer', selected && '!border-accent')}
                        onClick={event => {
                            setFeedbackDemoVersion(version);
                            openFeedbackPopup(event.currentTarget);
                        }}
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                    >
                        {label}
                    </Button>
                );
            })}
        </section>
    );
}
