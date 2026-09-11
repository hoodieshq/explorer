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

import { saveFlowVariantAtom } from './save-flow-variants';

/**
 * The endpoint field and the offer to keep it, for the dropdown's Custom row.
 *
 * The field and the offer are one component because the review variants (`save-flow-variants.ts`) differ
 * in exactly how the two are arranged — beside each other, stacked with a name field of its own, one in
 * place of the other, or the offer *inside* the field as a browser's star — so a component that owned only
 * the offer could not express them.
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
 * Save is `variant="default"` — the app's grey fill with a rule — and not the brand accent: green is what
 * this palette spends on a primary action and on a healthy connection, and a green chip standing
 * permanently in the bar claimed both. The accent is left for the tick that commits a name, which is a
 * momentary, deliberate confirmation.
 *
 * Two things are passed per instance rather than baked in: `cursor-pointer`, because the `tw` lineage
 * leaves the UA cursor alone, and a matched height where a control stands beside a field (`Input` is
 * `h-9`, `size="icon"` is 28px square).
 */
/** Beside an `h-9` field, an icon button has to be its height rather than the 28px square it defaults to. */
const FIELD_ICON_BUTTON_CLASSES = 'h-9 w-9 cursor-pointer';

/** The caption above a field, in the panel's caption voice one step smaller — it labels a control, not a
 *  group of rows. */
export const FIELD_CAPTION_CLASSES = 'text-[10px] font-medium uppercase tracking-[0.12em] text-outer-space-300';

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

    /** The one-click save: the endpoint is kept as it is, and the name is asked for in the list. */
    const saveUnnamed = () => {
        if (!isEndpoint) {
            setError(new Error('Enter a full RPC URL first — https://host or http://localhost:8899.'));
            return;
        }
        try {
            addSavedCluster({ name: '', url });
        } catch (cause) {
            setError(new Error('Not enough storage space. Try removing an endpoint you no longer use.', { cause }));
        }
    };

    const save = () => {
        if (!isEndpoint) {
            setError(new Error('Enter a full RPC URL first — https://host or http://localhost:8899.'));
            return;
        }
        if (!willStore) {
            setError(new Error('Give the endpoint a name.'));
            return;
        }
        try {
            addSavedCluster({ name: willStore, url });
        } catch (cause) {
            // localStorage is the only failure mode here, and it is always the quota.
            setError(new Error('Not enough storage space. Try removing an endpoint you no longer use.', { cause }));
            return;
        }
        close();
    };

    return {
        close,
        error,
        isEndpoint,
        name: name ?? '',
        naming,
        onNameChange: setName,
        open,
        save,
        saveUnnamed,
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
    /** Reports the endpoint the Save button just kept, so the list can open its name field. */
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
            {variant === 'omnibox' && <AddressBar onChange={onChange} onSaved={onSaved} save={save} url={value} />}
            {variant === 'field' && <AlwaysUpName save={save} urlField={urlField} />}
            {variant === 'prompt' && <PromptThenName save={save} urlField={urlField} />}
            {variant === 'morph' && <MorphToName save={save} url={value} urlField={urlField} />}
            {save.error && <span className={ERROR_CLASSES}>{save.error.message}</span>}
        </>
    );
}

/**
 * The endpoint field with its Save inside it, on its own — for a surface with no variants to switch
 * between that simply wants this control (`ClusterFieldFirstBody`, the v3.4 menu). Naming still happens in
 * the list: `onSaved` names the endpoint just kept, and that row opens its name field.
 */
export function EndpointFieldWithSave({
    draft,
    fieldClassName,
    fieldRef,
    lead,
    onFocus,
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
    onSaved: (url: string) => void;
    savedClusters: SavedCluster[];
}) {
    const save = useEndpointSave(draft.value, savedClusters);
    return (
        <>
            <AddressBar
                fieldClassName={fieldClassName}
                fieldRef={fieldRef}
                lead={lead}
                onChange={draft.onChange}
                onFocus={onFocus}
                onSaved={onSaved}
                save={save}
                url={draft.value}
            />
            {save.error && <span className={ERROR_CLASSES}>{save.error.message}</span>}
        </>
    );
}

/**
 * `omnibox` — the endpoint field with its own Save inside it, at the right-hand end, the way a browser
 * keeps the favourite control in the address bar rather than beside it. Always there, costing no line of
 * its own.
 *
 * Save takes one click and asks nothing: the endpoint joins the list below immediately, unnamed, and the
 * name is asked for *there* — in the row that just appeared, where the reader can see what they are
 * naming. Left blank it stays blank and the row shows its host; the name can be written any time after,
 * from the row's own rename control. Nothing is lost by not answering, which is the point: the old flow
 * made naming a gate in front of saving.
 *
 * The field is the app's `Input`, not a hand-rolled frame, so it carries the same height, radius, focus
 * ring and dark treatment as every other field. The button rides inside it — absolutely placed, with the
 * field's right padding opened up to clear it — which is what "inside the field" has to mean for a
 * component that owns its own border.
 */
function AddressBar({
    fieldClassName,
    fieldRef,
    lead,
    onChange,
    onFocus,
    onSaved,
    save,
    url,
}: {
    fieldClassName?: string;
    fieldRef?: React.RefObject<HTMLInputElement | null>;
    /** Rendered inside the field at its left edge, the way a browser keeps the padlock there. */
    lead?: React.ReactNode;
    onChange: (next: string) => void;
    onFocus?: () => void;
    /** Tells the list which row to open a name field on: the one just saved. */
    onSaved: (url: string) => void;
    save: Save;
    url: string;
}) {
    const kept = save.savedAs !== undefined;
    /**
     * What is wrong with what has been typed, said under the field rather than only in the button's
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

    return (
        <>
            <div className="relative">
                {lead !== undefined && (
                    // 10px in, which centres a 13px glyph in the 32px well the field's `pl-8` opens.
                    <span className="pointer-events-none absolute left-2.5 top-1/2 flex -translate-y-1/2 items-center">
                        {lead}
                    </span>
                )}
                <Input
                    ref={fieldRef}
                    type="url"
                    variant="dark"
                    value={url}
                    aria-label="Custom RPC URL"
                    placeholder="https://"
                    onChange={e => onChange(e.target.value)}
                    onFocus={onFocus}
                    // Room for the button inside the field, wide enough for the longer "Saved" state so
                    // the text does not reflow when it changes. `pr-*` rather than a wrapper's padding:
                    // the field draws its own box, so the text has to stop short of the control, not the
                    // box — and Tailwind emits `pr` after `px`, which is what lets it beat the field's
                    // own `px-4`.
                    className={cn('pr-[84px]', lead !== undefined && 'pl-8', fieldClassName)}
                    data-testid="custom-url-omnibox"
                />
                {/* Inside the field, and a button in its own right. `default` and not the brand accent:
                    green is what the app spends on a primary action and on a good connection, and a
                    permanent green chip in the bar claimed both while the actual subject of the plate is
                    the endpoint. Grey fill with a rule reads as a button without competing. Once the
                    endpoint is kept it drops to the outline treatment, disabled — the same shape, visibly
                    spent.

                    `right-1` and not a wider inset: the field is `h-9` and the button `h-7`, so centring
                    it vertically leaves exactly 4px above and below, and the side gap has to be the same
                    4px or the button reads as sitting off-centre in its own well. */}
                <Button
                    variant={kept ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => {
                        save.saveUnnamed();
                        onSaved(url);
                    }}
                    disabled={!canSave}
                    aria-label={
                        kept ? `Already saved${save.savedAs ? ` as “${save.savedAs}”` : ''}` : 'Save this endpoint'
                    }
                    title={
                        kept
                            ? `Already saved${save.savedAs ? ` as “${save.savedAs}”` : ''}`
                            : canSave
                              ? 'Save this endpoint — you can name it in the list below'
                              : (missing ?? 'Enter a full RPC URL to save it')
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer"
                    data-testid="save-custom-cluster-btn"
                >
                    {kept ? <Check aria-hidden /> : undefined}
                    {kept ? 'Saved' : 'Save'}
                </Button>
            </div>
            {missing && (
                <span className={HINT_CLASSES} data-testid="save-disabled-reason">
                    {missing}
                </span>
            )}
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
                    <Bookmark aria-hidden />
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
                        <Bookmark aria-hidden />
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
                    icon={<Bookmark aria-hidden />}
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
                    icon={<Check aria-hidden />}
                />
                {/* Outlined, like the list's own naming row: beside a filled OK, a ghost glyph does not
                    read as a button. */}
                <IconButton
                    variant="outline"
                    className="cursor-pointer"
                    onClick={save.close}
                    aria-label="Cancel saving"
                    title="Cancel"
                    icon={<X aria-hidden />}
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
                <Check size={12} aria-hidden />
                Saved as “{savedAs}”
            </span>
        </>
    );
}
