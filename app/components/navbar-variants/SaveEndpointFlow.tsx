'use client';

import { Button } from '@components/shared/ui/button';
import { IconButton } from '@components/shared/ui/icon-button';
import { Input } from '@components/shared/ui/input';
import { cn } from '@components/shared/utils';
import { parseRpcEndpoint } from '@entities/cluster';
import {
    type CustomUrlDraft,
    MAX_CLUSTER_NAME_LENGTH,
    normalizeClusterName,
    type SavedCluster,
    suggestClusterName,
    useSavedClusters,
} from '@features/cluster-switcher/client';
import { useAtomValue } from 'jotai';
import React, { useState } from 'react';
import { Bookmark, Check, X } from 'react-feather';

import {
    FIELD_CAPTION_CLASSES,
    FIELD_MENU_BORDER_CLASSES,
    MENU_PRIMARY_BUTTON_CLASSES,
    MENU_SECONDARY_BUTTON_CLASSES,
} from './cluster-row-classes';
import { EndpointForm } from './EndpointForm';
import { STROKE_ON_24 } from './icon-sets';
import { saveFlowVariantAtom } from './save-flow-variants';

/**
 * The endpoint field and the offer to keep it, for the dropdown's Custom row.
 *
 * The field and the offer are one component because the review variants (`save-flow-variants.ts`) differ
 * in exactly how the two are arranged — beside each other, stacked with a name field of its own, one in
 * place of the other, or Go in the field with the offer as a button under it — so a component that owned
 * only the offer could not express them.
 *
 * Everything that is not layout is shared: the field's debounced commit and consent are
 * `useCustomUrlDraft`'s, the name's cap, normalization and suggested default are the feature's
 * (`cluster-name`), and the write is `addSavedCluster`. What the flow adds is that the offer is on screen
 * from the start — the panel's `SaveClusterForm` shows a full-width button only once the field holds
 * something savable, which is how a first-time reader never learns endpoints can be kept at all.
 */

/**
 * Every control here is the app's own `Button` (or `IconButton`, which is `Button` at `size="icon"`), so
 * the switcher's buttons are the switcher's buttons and not a second set that merely resembles them.
 * The accent is spent on the one primary action of each step — Go in the field, Save in the form — because
 * green is what this palette spends on a primary action and on a healthy connection, and a second green
 * control beside either claimed both. Everything secondary is the outlined button: the "Save…" that opens
 * the form, the form's Cancel, a removed row's Restore. (The review-only flows further down still use
 * the grey-filled `default`; they are not the shipping surface.)
 *
 * Two things are passed per instance rather than baked in: `cursor-pointer`, because the `tw` lineage
 * leaves the UA cursor alone, and a matched height where a control stands beside a field (`Input` is
 * `h-9`, `size="icon"` is 28px square).
 */
/** Beside an `h-9` field, an icon button has to be its height rather than the 28px square it defaults to. */
const FIELD_ICON_BUTTON_CLASSES = 'h-9 w-9 cursor-pointer';

/** Failures are the consent dialog's magenta, which is this palette's "no". */
const ERROR_CLASSES = 'text-xs leading-snug text-[#b45be1]';
const HINT_CLASSES = 'text-[11px] leading-snug text-outer-space-300';

/**
 * The naming state behind all three variants: what the name would be stored as, whether the endpoint can
 * be stored at all, and the one write.
 *
 * `name` is `undefined` until it is typed into, which is what lets the always-up field start empty and
 * still save under the suggested name shown as its placeholder. A cleared field falls back to the
 * suggestion too, and the flows that prefill say so in a line under the field rather than storing it
 * silently.
 */
function useEndpointSave(url: string, savedClusters: SavedCluster[]) {
    const { addSavedCluster } = useSavedClusters();
    const [name, setName] = useState<string | undefined>(undefined);
    const [naming, setNaming] = useState(false);
    // An `Error` rather than its message: the quota failure has a cause worth keeping with it, as the
    // panel's form does, and nothing here should log on the user's behalf.
    const [error, setError] = useState<Error | undefined>(undefined);

    const suggestion = suggestClusterName(
        url,
        savedClusters.map(saved => saved.name),
    );
    // The same check the reader applies, so the switcher cannot store an entry that is refused the moment
    // it is clicked. A plain `new URL` would accept `javascript:…` and bare `localhost:8899`.
    const isEndpoint = parseRpcEndpoint(url) !== undefined;
    const savedAs = savedClusters.find(saved => saved.url === url)?.name;
    const typed = normalizeClusterName(name ?? '');
    /** What a save right now would store. */
    const willStore = typed || suggestion;

    // Opened on an endpoint that is already kept, this is the *edit* of its name, so the field starts
    // from the name it has rather than from a suggestion it is not called.
    const open = () => {
        setName(savedAs ?? suggestion);
        setError(undefined);
        setNaming(true);
    };

    const close = () => {
        setName(undefined);
        setError(undefined);
        setNaming(false);
    };

    /**
     * Writes a new entry outright, for a form that holds its own name and address (`EndpointForm`). The
     * same two refusals the store applies to an edit, in the same words, so the form says the same thing
     * whichever way it was opened: the address has to be an endpoint, and it cannot be one already kept.
     * The store's own add would silently replace the entry on that URL, which is not what "save" means
     * from a field.
     */
    const keep = (name: string, nextUrl: string) => {
        if (!parseRpcEndpoint(nextUrl)) throw new Error('That is not a full RPC URL.');
        if (savedClusters.some(saved => saved.url === nextUrl))
            throw new Error('Another saved endpoint has that address.');
        addSavedCluster({ name: normalizeClusterName(name), url: nextUrl });
    };

    /** Writes the entry. `true` once it is kept, so a caller can act on the save and not on the click. */
    const save = (): boolean => {
        if (!isEndpoint) {
            setError(new Error('Enter a full RPC URL first — https://host or http://localhost:8899.'));
            return false;
        }
        if (!willStore) {
            setError(new Error('Give the endpoint a name.'));
            return false;
        }
        try {
            addSavedCluster({ name: willStore, url });
        } catch (cause) {
            // localStorage is the only failure mode here, and it is always the quota.
            setError(new Error('Not enough storage space. Try removing an endpoint you no longer use.', { cause }));
            return false;
        }
        close();
        return true;
    };

    return {
        close,
        error,
        isEndpoint,
        keep,
        name: name ?? '',
        naming,
        onNameChange: setName,
        open,
        save,
        savedAs,
        suggestion,
        typed,
        willStore,
    };
}

type Save = ReturnType<typeof useEndpointSave>;

export function CustomEndpointFields({
    draft,
    onSaved,
    savedClusters,
}: {
    /** Owned by the dropdown, not by this component: the saved list writes into the same field. */
    draft: CustomUrlDraft;
    /** Reports the endpoint just kept under a name, so the surface can hand the outline to its new row. */
    onSaved: (url: string) => void;
    savedClusters: SavedCluster[];
}) {
    const { onChange, value } = draft;
    const variant = useAtomValue(saveFlowVariantAtom);
    const save = useEndpointSave(value, savedClusters);

    // No flex utilities on it: two of the three flows put it on a line with a button, and each wraps it
    // in the growing box itself. `Input` is `w-full`, so it fills whatever box it is given.
    const urlField = (
        <Input
            type="url"
            variant="dark"
            value={value}
            aria-label="Custom RPC URL"
            placeholder="https://"
            onChange={e => onChange(e.target.value)}
        />
    );

    return (
        <>
            {variant === 'omnibox' && (
                <AddressBar onChange={onChange} onCommit={draft.select} onSaved={onSaved} save={save} url={value} />
            )}
            {variant === 'field' && <AlwaysUpName save={save} urlField={urlField} />}
            {variant === 'prompt' && <PromptThenName save={save} urlField={urlField} />}
            {variant === 'morph' && <MorphToName save={save} url={value} urlField={urlField} />}
            {save.error && <span className={ERROR_CLASSES}>{save.error.message}</span>}
        </>
    );
}

/**
 * The endpoint field with Go inside it and Save under it, on its own — for a surface with no variants to
 * switch between that simply wants this control (`ClusterFieldFirstBody`, the v3.4 menu, and
 * `ClusterCustomLastBody`, the v3.5 one). Naming happens right here, under the field; `onSaved` reports
 * the endpoint once it is kept, so the surface can hand the outline to the row that has just appeared.
 */
export function EndpointFieldWithSave({
    draft,
    fieldClassName,
    fieldRef,
    onFocus,
    onGo,
    onSaved,
    savedClusters,
}: {
    draft: CustomUrlDraft;
    /**
     * Rides on the field. Only for what a *surface* has to say about it — v3.5 quiets the focus mark,
     * since inside a menu the shared field's 2px accent ring is the loudest thing on screen. Not for
     * rebuilding the field: it is the design system's, border, radius and all.
     */
    fieldClassName?: string;
    /** So a surface can put the cursor back where it took it from. */
    fieldRef?: React.RefObject<HTMLInputElement | null>;
    /** A mark for the left of the field. */
    lead?: React.ReactNode;
    /** Reaching into the field is choosing it, which a surface may want to know. */
    onFocus?: () => void;
    /** Ran once the address has been applied from the field — the surface that owns the menu shuts it. */
    onGo?: () => void;
    /** Ran once the address has been kept under a name. */
    onSaved: (url: string) => void;
    savedClusters: SavedCluster[];
}) {
    const save = useEndpointSave(draft.value, savedClusters);
    return (
        <>
            <AddressBar
                fieldClassName={fieldClassName}
                fieldRef={fieldRef}
                onChange={draft.onChange}
                onCommit={draft.select}
                onFocus={onFocus}
                onGo={onGo}
                onSaved={onSaved}
                save={save}
                url={draft.value}
            />
            {save.error && <span className={ERROR_CLASSES}>{save.error.message}</span>}
        </>
    );
}

/**
 * `omnibox` — the endpoint field with Go inside it, at the right-hand end, and Save as a plain button on
 * the line under it.
 *
 * Nothing in the field applies itself. It is edited freely, and Go — or Enter, which is the keyboard's
 * Go — is what puts the address to use. Typing used to navigate on its own after a pause, which changed
 * the page behind the menu under a half-decided address, and on a keyboard made a Go button a second way
 * to do what the field already did. With the field waiting to be told, the button *is* the control, so
 * it stands there on every device, before the reader reaches for it, and is only ever disabled: a field
 * without a full RPC URL has nothing to go to yet.
 *
 * Save is the same kind of thing — a button that says what it does, always on screen and greyed out
 * rather than gone when there is nothing to keep: no URL yet, half a URL, or an address already in the
 * list, where it reads "Saved". A control that comes and goes has to be found first (the old full-width
 * offer appeared only once the field held something savable, so a first-time reader never learned
 * endpoints could be kept); one that is disabled is already found and only has to be explained, which
 * the line under the field does (`missing`).
 *
 * Save asks for the name right where it was pressed, in the very form the list edits an entry with
 * (`EndpointForm`): the field and its Go give way to that form, with the typed address already in its
 * second field, and Cancel brings the field back. One form for both errands, so keeping an endpoint and
 * correcting one look and behave the same — the two used to be two forms that merely resembled each
 * other. The name used to be asked for up in the list, in the row the save had just created, which meant
 * the answer to a button pressed here appeared somewhere else, and backing out of it had to delete an
 * entry that should never have existed yet.
 *
 * The field is the app's `Input`, not a hand-rolled frame, so it carries the same height, radius, focus
 * ring and dark treatment as every other field. Go rides inside it — absolutely placed, with the field's
 * right padding opened up to clear it — which is what "inside the field" has to mean for a component that
 * owns its own border.
 */
function AddressBar({
    fieldClassName,
    fieldRef,
    onChange,
    onCommit,
    onFocus,
    onGo,
    onSaved,
    save,
    url,
}: {
    fieldClassName?: string;
    fieldRef?: React.RefObject<HTMLInputElement | null>;
    onChange: (next: string) => void;
    /** Applies what is in the field now. */
    onCommit: (url: string) => void;
    onFocus?: () => void;
    onGo?: () => void;
    /** Ran once the address has been kept under a name. */
    onSaved: (url: string) => void;
    save: Save;
    url: string;
}) {
    const kept = save.savedAs !== undefined;
    /**
     * What is wrong with what has been typed, said under the field rather than only in the buttons'
     * `title`: a control that is greyed out with no reason given reads as broken, and a tooltip is no
     * answer on a touch screen.
     *
     * Two states are deliberately silent. **An empty field** is not a fault — nothing has been attempted,
     * and a line telling the reader to type in a field they have not reached yet is the menu talking
     * first. **Already saved** is an outcome rather than something to fix, and this line is where the
     * surface puts what went wrong; the button says that one by reading "Saved".
     */
    const missing =
        url.trim() !== '' && !save.isEndpoint
            ? 'Not a full RPC URL yet — it needs a scheme, like https://host or http://localhost:8899.'
            : undefined;
    /**
     * Whether it *can* be saved, which is not the same question as whether anything is said about it: an
     * empty field cannot be saved and is told nothing, so the two were split. Tying `disabled` to the
     * message left the button live on an empty field, where pressing it produced the very complaint the
     * silence was there to avoid.
     */
    const canSave = !kept && save.isEndpoint;

    /** Go, by button or by Enter: the address applies at once and the menu gets out of the way. */
    const go = () => {
        onCommit(url);
        onGo?.();
    };

    /**
     * Whether the form stands where the field was. Backing out of it puts the cursor back in the address
     * field — the reader was in the middle of something there, and Escape or Cancel should not leave them
     * on nothing. The field is not in the tree until the form has gone, so the focus is placed by the
     * effect below, on the render that brings the field back.
     */
    const [naming, setNaming] = useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const refocus = React.useRef(false);
    React.useEffect(() => {
        if (naming || !refocus.current) return;
        refocus.current = false;
        inputRef.current?.focus();
    }, [naming]);
    /** The address the form kept, which may differ from what the field held if it was corrected there. */
    const keptUrl = React.useRef(url);

    if (naming)
        return (
            <EndpointForm
                intent="create"
                saved={{ name: '', url }}
                onCancel={() => {
                    refocus.current = true;
                    setNaming(false);
                }}
                onSave={(name, nextUrl) => {
                    save.keep(name, nextUrl);
                    keptUrl.current = nextUrl;
                }}
                onDone={() => {
                    setNaming(false);
                    // The field follows an address corrected in the form, or it would show one endpoint
                    // while the list had just been handed another.
                    if (keptUrl.current !== url) onChange(keptUrl.current);
                    onSaved(keptUrl.current);
                }}
            />
        );

    return (
        <>
            <div className="relative">
                <Input
                    ref={node => {
                        inputRef.current = node;
                        if (fieldRef) fieldRef.current = node;
                    }}
                    type="url"
                    variant="dark"
                    value={url}
                    aria-label="Custom RPC URL"
                    placeholder="https://"
                    onChange={e => onChange(e.target.value)}
                    // Enter is the reader saying "this one, now": the endpoint goes live, the field lets
                    // go of the focus — on a phone that is what puts the keyboard away — and the menu
                    // shuts. It answers to the same rule as the button: half an address is nothing to go
                    // to, so on one the key does nothing rather than shutting the menu over an unchanged
                    // page.
                    onKeyDown={event => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        if (!save.isEndpoint) return;
                        event.currentTarget.blur();
                        go();
                    }}
                    onFocus={onFocus}
                    // Room at the tail for Go's word with the button's own padding either side, 4px clear
                    // of it. `pr-*` rather than a wrapper's padding: the field draws its own box, so the
                    // text has to stop short of the control, not the box — and Tailwind emits `pr` after
                    // `px`, which is what lets it beat the field's own `px-4`.
                    // The menu's own rule on the field, matched to the rows' plates; see the constant.
                    className={cn('pr-10', FIELD_MENU_BORDER_CLASSES, fieldClassName)}
                    data-testid="custom-url-omnibox"
                />
                {/* Go ends the errand, so it sits at the far end of the address, where a send button
                    lives — and it is a word, not a glyph, so it keeps a word's width: the label with the
                    button's own padding either side of it, not a square it has to be squeezed into.

                    Always drawn, on every device. It used to appear only while the field had the focus
                    and only on touch, on the grounds that the field applied itself and a keyboard had
                    Enter; now that the field waits to be told, the button is how it is told, and a
                    control that is the way has to be visible before the reader reaches for it.

                    Its box is set by its distance from the field's edges — 4px above, below and to the
                    right — rather than by a height of its own: the field is `h-9`, which leaves the
                    button the 28px the other small buttons here are, and the three insets cannot come
                    apart whatever the field's box turns out to be. `!h-auto` because `size="sm"` would
                    otherwise pin the height and let the insets drift. */}
                <Button
                    variant="accent"
                    size="sm"
                    onClick={go}
                    disabled={!save.isEndpoint}
                    title={save.isEndpoint ? 'Use this endpoint' : (missing ?? 'Enter a full RPC URL to use it')}
                    className={cn('absolute inset-y-1 right-1 !h-auto', MENU_PRIMARY_BUTTON_CLASSES)}
                    data-testid="go-custom-cluster-btn"
                >
                    Go
                </Button>
            </div>
            {missing && (
                <span className={HINT_CLASSES} data-testid="save-disabled-reason">
                    {missing}
                </span>
            )}
            {/* Keeping the address, as a button under the field: the outlined button, the one every
                secondary action in this menu wears — the form's Cancel, a removed row's Restore — and
                not the accent, which is spent on Go above it; two green controls on one field would be
                two primary actions. The same size as Go and no wider than its word, so the two read as
                one pair of controls belonging to the field. `self-start`,
                because the plate is a column and would otherwise stretch it to the field's width. The
                bookmark fills in once the address is kept, and the word changes with it, so the state is
                told twice over and read once.

                The ellipsis is the promise that a name is asked for before anything is kept — the same
                mark the `prompt` flow's "Save as…" carries, and the reason a press here does not read as
                the save itself. Pressed, the field and this button give way to `EndpointForm` above.

                Disabled, never absent. `aria-label` carries the name it is kept under, which the word
                alone cannot: "Saved" is the state, "already saved as X" is the fact behind it. */}
            <Button
                variant="outline"
                size="sm"
                className={cn(MENU_SECONDARY_BUTTON_CLASSES, 'self-start')}
                onClick={() => setNaming(true)}
                disabled={!canSave}
                aria-label={kept ? `Already saved${save.savedAs ? ` as “${save.savedAs}”` : ''}` : 'Save this endpoint'}
                title={
                    kept
                        ? `Already saved${save.savedAs ? ` as “${save.savedAs}”` : ''}`
                        : canSave
                          ? 'Keep this endpoint under a name'
                          : (missing ?? 'Enter a full RPC URL to save it')
                }
                data-testid="save-custom-cluster-btn"
            >
                <Bookmark strokeWidth={STROKE_ON_24} aria-hidden fill={kept ? 'currentColor' : 'none'} />
                {kept ? 'Saved' : 'Save…'}
            </Button>
        </>
    );
}

/**
 * `field` — the name is a field of its own, always under the endpoint, with a small Save beside it. The
 * suggested name sits in the placeholder, so an untouched field is not an empty one: it says what saving
 * would call this, and typing over it is the edit.
 */
function AlwaysUpName({ save, urlField }: { save: Save; urlField: React.ReactNode }) {
    if (save.savedAs !== undefined) return <SavedRow savedAs={save.savedAs} urlField={urlField} />;

    return (
        <>
            {urlField}
            <span className={FIELD_CAPTION_CLASSES}>Save as</span>
            <div className="flex items-center gap-1.5">
                <NameInput save={save} placeholder={save.suggestion || 'Name for this endpoint'} />
                <Button
                    variant="default"
                    className="shrink-0 cursor-pointer"
                    disabled={!save.isEndpoint}
                    onClick={save.save}
                    title={
                        save.isEndpoint
                            ? `Keep this endpoint as “${save.willStore}”`
                            : 'Enter a full RPC URL to save it'
                    }
                    data-testid="save-custom-cluster-btn"
                >
                    <Bookmark strokeWidth={STROKE_ON_24} aria-hidden />
                    Save
                </Button>
            </div>
        </>
    );
}

/**
 * `prompt` — a compact "Save as…" beside the endpoint, which unfolds the name row under it. The ellipsis
 * is the promise that a name is asked for before anything is kept.
 */
function PromptThenName({ save, urlField }: { save: Save; urlField: React.ReactNode }) {
    if (save.savedAs !== undefined) return <SavedRow savedAs={save.savedAs} urlField={urlField} />;

    return (
        <>
            <div className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1">{urlField}</span>
                {!save.naming && (
                    <Button
                        variant="default"
                        className="shrink-0 cursor-pointer"
                        disabled={!save.isEndpoint}
                        onClick={save.open}
                        title={save.isEndpoint ? 'Keep this endpoint under a name' : 'Enter a full RPC URL to save it'}
                        data-testid="save-custom-cluster-btn"
                    >
                        <Bookmark strokeWidth={STROKE_ON_24} aria-hidden />
                        Save as…
                    </Button>
                )}
            </div>
            {save.naming && (
                <>
                    <span className={FIELD_CAPTION_CLASSES}>Name this endpoint</span>
                    <NameRow save={save} />
                    {!save.typed && save.suggestion && (
                        <span className={HINT_CLASSES}>Saving as “{save.suggestion}”</span>
                    )}
                </>
            )}
        </>
    );
}

/**
 * `morph` — a bookmark at the end of the field, and taking it turns the plate into the naming step: the
 * endpoint drops to fine print and the name takes the field's place. One field at a time, which is what
 * the 320px popover has room for.
 */
function MorphToName({ save, url, urlField }: { save: Save; url: string; urlField: React.ReactNode }) {
    if (save.savedAs !== undefined) return <SavedRow savedAs={save.savedAs} urlField={urlField} />;

    if (!save.naming)
        return (
            <div className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1">{urlField}</span>
                <IconButton
                    variant="default"
                    className={FIELD_ICON_BUTTON_CLASSES}
                    disabled={!save.isEndpoint}
                    onClick={save.open}
                    title={save.isEndpoint ? 'Keep this endpoint under a name' : 'Enter a full RPC URL to save it'}
                    aria-label="Save this endpoint under a name"
                    data-testid="save-custom-cluster-btn"
                    icon={<Bookmark strokeWidth={STROKE_ON_24} aria-hidden />}
                />
            </div>
        );

    return (
        <>
            <span className={FIELD_CAPTION_CLASSES}>Save endpoint as</span>
            <NameRow save={save} />
            {/* The endpoint being named, verbatim: the name field has taken its place, and a naming step
                that does not say what it is naming is a guess. */}
            <span className="truncate font-mono text-[11px] text-outer-space-300" title={url}>
                {url}
            </span>
            {!save.typed && save.suggestion && <span className={HINT_CLASSES}>Saving as “{save.suggestion}”</span>}
        </>
    );
}

/**
 * The name field plus commit and cancel, for the two flows that ask for the name in a step of its own.
 * Both controls sit inside the field, as the bar's Save does and as the list's naming row does: at 320px
 * a pair of field-height buttons beside the field left too little of it to read a name in.
 */
function NameRow({ save }: { save: Save }) {
    return (
        <div className="relative">
            <NameInput
                save={save}
                placeholder={save.suggestion || 'Name for this endpoint'}
                className="pr-[70px]"
                autoFocus
            />
            {/* Same 4px inset as the bar's Save, for the same arithmetic: `h-7` controls in an `h-9`
                field. */}
            <span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {/* A tick, like the list's naming row: inside the field there is room for a mark, not a
                    label. */}
                <IconButton
                    variant="accent"
                    className="cursor-pointer"
                    onClick={save.save}
                    disabled={!save.willStore}
                    aria-label="Save this name"
                    title={`Keep this endpoint as “${save.willStore}”`}
                    data-testid="confirm-save-cluster-btn"
                    icon={<Check strokeWidth={STROKE_ON_24} aria-hidden />}
                />
                {/* Outlined, like the list's own naming row: beside a filled OK, a ghost glyph does not
                    read as a button. */}
                <IconButton
                    variant="outline"
                    className="cursor-pointer"
                    onClick={save.close}
                    aria-label="Cancel saving"
                    title="Cancel"
                    icon={<X strokeWidth={STROKE_ON_24} aria-hidden />}
                />
            </span>
        </div>
    );
}

/**
 * The one name field. Enter saves and Escape backs out, because a field with a button beside it that only
 * answered to the button would be the odd one out among the dropdown's controls.
 *
 * `maxLength` is the cap the stored name is held to, repeated here so the field cannot show a name the
 * save would silently shorten.
 */
function NameInput({
    autoFocus,
    className,
    placeholder,
    save,
}: {
    autoFocus?: boolean;
    /** Where the flow puts controls inside the field: the padding that clears them. */
    className?: string;
    placeholder: string;
    save: Save;
}) {
    return (
        <Input
            type="text"
            variant="dark"
            className={cn('min-w-0 grow', className)}
            aria-label="Name for this endpoint"
            placeholder={placeholder}
            value={save.name}
            maxLength={MAX_CLUSTER_NAME_LENGTH}
            onChange={e => save.onNameChange(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    save.save();
                }
                // Stopped here: this popover closes on Escape, and a key that both backed out of the
                // naming step and shut the menu would lose the endpoint the step was about.
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    save.close();
                }
            }}
            data-testid="cluster-name-input"
            autoFocus={autoFocus}
        />
    );
}

/**
 * What stands where the offer was once the endpoint in the field is already kept: the name it is kept
 * under, stated. Renaming is on the saved row itself, where the entry is — an edit control here would be
 * a second place to do one thing.
 */
function SavedRow({ savedAs, urlField }: { savedAs: string; urlField: React.ReactNode }) {
    return (
        <>
            {urlField}
            <span
                className={cn(FIELD_CAPTION_CLASSES, 'flex items-center gap-1.5 text-[#1dd79b]')}
                data-testid="endpoint-saved-as"
            >
                <Check size={12} strokeWidth={STROKE_ON_24} aria-hidden />
                Saved as “{savedAs}”
            </span>
        </>
    );
}
