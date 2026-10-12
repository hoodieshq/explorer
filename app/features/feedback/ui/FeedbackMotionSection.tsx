'use client';

// REVIEW(HOO-1815): the design menu's easing editor for the morph; remove before the external PR, after baking the
// chosen values (Copy) into feedback-sent-motion.ts.
import { useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import { Button } from '@/app/components/shared/ui/button';
import { Input } from '@/app/components/shared/ui/input';
import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import {
    cubicBezierCss,
    type MorphSegmentId,
    resetMorphTuning,
    setMorphSegment,
    useMorphTuning,
} from '../model/morph-tuning';
import { EasingCurveEditor } from './EasingCurveEditor';
import { playFoldIntoToast, playToastLife } from './feedback-sent-motion';
import { FeedbackSentToast } from './FeedbackSentToast';
import { canAnimate, prefersReducedMotion } from './motion-support';

const SEGMENTS: { label: string; value: MorphSegmentId }[] = [
    { label: 'Fold', value: 'fold' },
    { label: 'Hit', value: 'hit' },
    { label: 'Rebound', value: 'rebound' },
    { label: 'Settle', value: 'settle' },
];

const HINTS: Record<MorphSegmentId, string> = {
    fold: 'The popup shrinks to the toast and flies into the ceiling.',
    hit: 'Into the squash: 10% wider, 10% lower.',
    rebound: 'Past the rest: 3% narrower, 3% taller.',
    settle: 'Into the resting shape.',
};

/** Tunes each segment of the morph's duration and easing, and plays it on a stand-in popup. */
export function FeedbackMotionSection() {
    const tuning = useMorphTuning();
    const [segmentId, setSegmentId] = useState<MorphSegmentId>('fold');
    const [copied, setCopied] = useState(false);
    const segment = tuning[segmentId];
    const preview = useMorphPreview();

    const copy = () => {
        const lines = SEGMENTS.map(
            ({ value }) => `${value}: ${tuning[value].ms}ms ${cubicBezierCss(tuning[value].easing)}`,
        );
        void navigator.clipboard?.writeText(lines.join('\n')).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <DesignMenuSection title="Toast motion">
            <DesignMenuOptions onChange={setSegmentId} options={SEGMENTS} value={segmentId} />
            <p className="m-0 text-xs text-outer-space-300">{HINTS[segmentId]}</p>
            <label className="flex items-center justify-between gap-3 text-xs text-neutral-200">
                Duration, ms
                <Input
                    className="!h-7 !w-24 font-mono !text-xs"
                    min={0}
                    step={10}
                    type="number"
                    value={segment.ms}
                    variant="dark"
                    onChange={event => {
                        const ms = Number(event.target.value);
                        if (Number.isFinite(ms) && ms >= 0) setMorphSegment(segmentId, { ...segment, ms });
                    }}
                />
            </label>
            <input
                aria-label="Duration"
                className="w-full accent-dark-accent"
                max={3000}
                min={0}
                step={10}
                type="range"
                value={segment.ms}
                onChange={event => setMorphSegment(segmentId, { ...segment, ms: Number(event.target.value) })}
            />
            <EasingCurveEditor
                value={segment.easing}
                onChange={easing => setMorphSegment(segmentId, { ...segment, easing })}
            />
            <div className="flex gap-2">
                <Button className="flex-1 cursor-pointer" size="sm" variant="accent" onClick={preview.play}>
                    Play
                </Button>
                <Button className="cursor-pointer" size="sm" variant="outline" onClick={copy}>
                    {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button className="cursor-pointer" size="sm" variant="outline" onClick={resetMorphTuning}>
                    Reset
                </Button>
            </div>
            {preview.element}
        </DesignMenuSection>
    );
}

/**
 * The morph on a stand-in popup: a box the size and look of the real one, in the middle of a dimmed page, with the
 * real toast. Kept under the design menu (z 1202) so the menu stays in reach while it plays.
 */
function useMorphPreview() {
    const [playing, setPlaying] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const toastRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const playingRef = useRef(false);

    const play = () => {
        if (playingRef.current || !canAnimate()) return;
        playingRef.current = true;
        flushSync(() => setPlaying(true));
        const panel = panelRef.current;
        const toast = toastRef.current;
        if (!panel || !toast) {
            playingRef.current = false;
            setPlaying(false);
            return;
        }
        const reduced = prefersReducedMotion();
        // A beat on screen first, so the eye finds the popup before it moves.
        void new Promise(resolve => setTimeout(resolve, 400))
            .then(() => {
                const { arrived } = playFoldIntoToast(
                    { content: contentRef.current, overlay: overlayRef.current, panel, toast },
                    reduced,
                );
                return arrived;
            })
            .then(() => playToastLife({ text: textRef.current, toast }, reduced))
            .catch(() => undefined)
            .finally(() => {
                playingRef.current = false;
                setPlaying(false);
            });
    };

    const element =
        playing &&
        createPortal(
            <>
                <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-[1201] bg-black/70" />
                <div className="pointer-events-none fixed inset-0 z-[1201] flex items-center justify-center px-4">
                    <div
                        ref={panelRef}
                        className="h-[420px] w-[min(448px,calc(100vw-32px))] rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 shadow-2xl"
                    >
                        <div ref={contentRef} className="flex flex-col gap-3 p-5 pt-6">
                            <p className="m-0 text-xl font-medium leading-snug text-white">Feedback</p>
                            <p className="m-0 text-sm text-outer-space-300">What would you like to share?</p>
                            <div className="mt-2 h-28 rounded-md border border-solid border-outer-space-800" />
                            <div className="h-9 rounded-md border border-solid border-outer-space-800" />
                            <div className="h-10 w-24 rounded-md bg-dark-accent" />
                        </div>
                    </div>
                </div>
                <FeedbackSentToast className="z-[1201]" textRef={textRef} toastRef={toastRef} />
            </>,
            document.body,
        );

    return { element, play };
}
