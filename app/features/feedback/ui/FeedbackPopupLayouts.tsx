'use client';

import { type ComponentType, type MouseEvent, type ReactNode, useState } from 'react';
import { ArrowUpRight, GitHub, X } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { cn } from '@/app/components/shared/utils';

import type { IconProps } from './feedback-icons';
import { FeedbackPopupForm, type FeedbackPopupFormProps } from './FeedbackPopupForm';

export interface FeedbackAction {
    id: 'feedback' | 'idea' | 'bug';
    title: string;
    description: string;
    Icon: ComponentType<IconProps>;
    /** Set for the actions that leave the explorer for GitHub. */
    href?: string;
    onSelect: () => void;
}

export interface FeedbackLayoutProps {
    actions: FeedbackAction[];
    /** Unset when the form cannot send (no Sentry DSN). */
    form?: Pick<FeedbackPopupFormProps, 'isSubmitting' | 'onSubmit'>;
    onClose: () => void;
}

/**
 * One topic at a time: a switch of Your thoughts / Idea / Bug over the form or the GitHub link. Sits in the
 * dialog box, so its actions keep text width, flush left, as the app's dialogs set them.
 */
export function FeedbackPillsLayout({ actions, form }: FeedbackLayoutProps) {
    const available = actions.filter(action => action.id !== 'feedback' || form);
    const [selectedId, setSelectedId] = useState(available[0].id);
    const selected = available.find(action => action.id === selectedId) ?? available[0];

    return (
        <div className="flex flex-col gap-6">
            {/* The inspector's encoding choice (HOO-803): plain Buttons in a group, the pressed one `default`
                with the accent edge, the rest `outline`, one size up from its `compact` for a touch target. It
                sits the dialog's 12px under the question it answers, and 24px part it from the content it
                switches. Below sm the padding tightens so the row fits 375px. */}
            <div aria-label="Topic" className="flex flex-wrap gap-1" role="group">
                {available.map(action => {
                    const isSelected = action.id === selected.id;
                    return (
                        <Button
                            key={action.id}
                            aria-pressed={isSelected}
                            className={cn(
                                'cursor-pointer !gap-1.5 !px-2.5 !text-sm sm:!px-3 [&_svg]:!size-4',
                                isSelected && '!border-accent',
                            )}
                            onClick={() => setSelectedId(action.id)}
                            variant={isSelected ? 'default' : 'outline'}
                        >
                            <action.Icon size={16} />
                            {action.title}
                        </Button>
                    );
                })}
            </div>
            {selected.id === 'feedback' && form ? (
                <FeedbackPopupForm {...form} labelledRating submitClassName="self-start" />
            ) : (
                <GitHubTopic action={selected} />
            )}
        </div>
    );
}

/**
 * The form and both GitHub links at once: the form in its own card on the left, with the close button, and a
 * card per GitHub link on the right. The cards float on the dimmed page, so the gaps between them close the
 * popup like a click anywhere else on the backdrop.
 */
export function FeedbackCardsLayout({ actions, form, onClose }: FeedbackLayoutProps) {
    const feedback = actions.find(action => action.id === 'feedback');
    const github = actions.filter(action => action.href);
    const closeOnGap = (event: MouseEvent<HTMLElement>) => {
        if (event.target === event.currentTarget) onClose();
    };

    return (
        // From md, both columns stretch to one height and their edges line up, with 12px between all the cards.
        // Below md the GitHub cards shrink to a compact pair under the form.
        <div className="grid w-full gap-2 md:grid-cols-[3fr_2fr] md:gap-3" onClick={closeOnGap}>
            {form && feedback && (
                <section className="relative flex flex-col rounded-xl border border-solid border-outer-space-800 bg-outer-space-900 p-4 md:p-6">
                    <FeedbackPopupForm
                        {...form}
                        heading={
                            // pr-8 keeps the heading clear of the card's close button.
                            <span className="pr-8">
                                <CardHeading action={feedback} />
                            </span>
                        }
                        submitClassName="self-start !px-6"
                    />
                    <CloseButton className="right-4 top-4 md:right-5 md:top-5" onClose={onClose} />
                </section>
            )}
            <div className="grid grid-cols-2 gap-1 md:flex md:flex-col md:gap-3" onClick={closeOnGap}>
                {github.map(action => (
                    <ExternalLink
                        key={action.id}
                        className="flex cursor-pointer flex-col gap-2 rounded-lg border border-solid border-outer-space-800 bg-outer-space-950 p-3 text-inherit no-underline transition-colors hover:border-neutral-600 hover:bg-heavy-metal-800 hover:text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:flex-1 md:gap-4 md:rounded-xl md:p-6"
                        href={action.href}
                        onClick={action.onSelect}
                    >
                        <CardHeading action={action} external />
                        {/* The wrapper hides it below md: the note's own inline-flex would race a `hidden` class. */}
                        <span className="mt-auto hidden md:block">
                            <span className="inline-flex items-center gap-1.5 text-xs text-outer-space-300">
                                <GitHub size={12} />
                                Opens GitHub in a new tab
                            </span>
                        </span>
                    </ExternalLink>
                ))}
            </div>
            {!(form && feedback) && <CloseButton className="right-4 top-4" onClose={onClose} />}
        </div>
    );
}

export function CloseButton({ className, onClose }: { className: string; onClose: () => void }) {
    return (
        <button
            aria-label="Close"
            className={cn(
                'absolute flex cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-outer-space-300 transition-colors hover:text-white',
                className,
            )}
            onClick={onClose}
            type="button"
        >
            <X size={18} />
        </button>
    );
}

const GITHUB_COPY = {
    bug: {
        button: 'Report a bug on GitHub',
        heading: 'Report a bug',
        note: 'Bugs are tracked as GitHub issues, with a template for the details.',
    },
    idea: {
        button: 'Suggest an idea on GitHub',
        heading: 'Suggest an idea',
        note: 'Ideas are collected as GitHub issues, where others can upvote them.',
    },
} as const;

function GitHubTopic({ action }: { action: FeedbackAction }) {
    if (!action.href || action.id === 'feedback') return undefined;
    const copy = GITHUB_COPY[action.id];

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium leading-none text-neutral-200">{copy.heading}</span>
                <p className="m-0 text-sm leading-snug text-outer-space-300">{copy.note}</p>
            </div>
            <Button asChild className="self-start !no-underline" size="lg" variant="outline">
                <ExternalLink href={action.href} onClick={action.onSelect}>
                    <GitHub />
                    {copy.button}
                    <ArrowUpRight />
                </ExternalLink>
            </Button>
        </div>
    );
}

function CardHeading({ action, external = false }: { action: FeedbackAction; external?: boolean }): ReactNode {
    const { Icon } = action;
    return (
        <span className="flex flex-col gap-1 md:gap-1.5">
            <span className="flex items-center gap-2 text-sm text-white md:text-base">
                <Icon size={18} />
                {action.title}
                {external && <ArrowUpRight className="ml-auto text-outer-space-300" size={16} />}
            </span>
            <span className="text-xs leading-snug text-outer-space-300 md:text-sm">{action.description}</span>
        </span>
    );
}
