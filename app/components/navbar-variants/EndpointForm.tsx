'use client';

import { Button } from '@components/shared/ui/button';
import { Input } from '@components/shared/ui/input';
import { cn } from '@components/shared/utils';
import { parseRpcEndpoint } from '@entities/cluster';
import { MAX_CLUSTER_NAME_LENGTH, type SavedCluster } from '@features/cluster-switcher/client';
import React, { useState } from 'react';

import {
    ACTIVE_ROW_CLASSES,
    FIELD_CAPTION_CLASSES,
    FIELD_MENU_BORDER_CLASSES,
    MENU_PRIMARY_BUTTON_CLASSES,
    MENU_SECONDARY_BUTTON_CLASSES,
} from './cluster-row-classes';

/**
 * The one form an endpoint entry is written in — a name field, an address field, Save and Cancel — used
 * both to edit a kept entry from its row and to keep a new one from the Custom field. The two used to be
 * two forms that merely resembled each other, and every difference between them (a tick where the other
 * had a word, a placeholder that said one thing here and another there, a Save that was disabled in one
 * and live in the other) read as an inconsistency rather than a choice. One component, so they cannot
 * drift.
 *
 * `intent` is what differs, and it is copy and test ids, not behaviour:
 *
 * - `edit` — the row's plate around it, headed "Edit endpoint name and address", addressed by the URL the
 *   entry holds now.
 * - `create` — no plate of its own, since it stands inside the Custom field's; headed "Name this
 *   endpoint", with the address the reader typed already in the second field.
 *
 * Both halves are editable either way, because an entry is a name *and* a URL, and a typo in the second
 * used to mean deleting the entry and saving it again from the field.
 *
 * Nothing is required of the name. Save on an empty name leaves the entry unnamed — the host keeps
 * standing in for it, and the pencil is still there tomorrow. The address is not free: `onSave` is
 * expected to refuse one that is not an endpoint, and one another entry already holds, by throwing with
 * the reason, which is shown under the fields.
 */
export function EndpointForm({
    intent,
    onCancel,
    onDone,
    onSave,
    saved,
}: {
    intent: 'create' | 'edit';
    onCancel: () => void;
    /** Ran after `onSave` returned without throwing. */
    onDone: () => void;
    /** Writes the entry. Throws, with a message the reader can act on, to refuse. */
    onSave: (name: string, url: string) => void;
    /** What the fields start from: the entry being edited, or the address to keep with no name yet. */
    saved: SavedCluster;
}) {
    const [name, setName] = useState(saved.name);
    const [url, setUrl] = useState(saved.url);
    const [error, setError] = useState<string | undefined>(undefined);
    const host = parseRpcEndpoint(saved.url)?.host ?? '';
    const ids = TEST_IDS[intent](saved.url);

    const commit = () => {
        try {
            onSave(name, url.trim());
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not save this endpoint.');
            return;
        }
        onDone();
    };

    // Enter commits from either field, Escape backs out of both. Escape is stopped here because this
    // popover closes on it, and a key that both left the form and shut the menu would lose the entry the
    // form was about.
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commit();
        }
        if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
        }
    };

    return (
        <div
            className={cn(
                'flex w-full flex-col gap-1.5 text-sm text-white',
                // Editing happens in the list, so the form wears the row's plate; a new entry is named
                // inside the Custom field's plate, and a plate inside a plate is one too many.
                intent === 'edit' && cn('rounded-md border border-solid px-3 pb-3 pt-2', ACTIVE_ROW_CLASSES),
            )}
            data-testid={ids.form}
        >
            <span className={FIELD_CAPTION_CLASSES}>
                {intent === 'edit' ? 'Edit endpoint name and address' : 'Name this endpoint'}
            </span>
            {/* Plain field, nothing riding inside it. The pair used to sit in this one, which was right
                while the form *was* this one field; with two of them, controls parked in the first said
                they belonged to the name alone — and they answer for the whole form. */}
            <Input
                type="text"
                variant="dark"
                className={FIELD_MENU_BORDER_CLASSES}
                aria-label={`Name for ${saved.url}`}
                placeholder="Endpoint name"
                value={name}
                maxLength={MAX_CLUSTER_NAME_LENGTH}
                onChange={e => setName(e.target.value)}
                onKeyDown={onKeyDown}
                data-testid={ids.name}
                autoFocus
            />
            {/* The address, editable rather than stated: it is half of what an entry is. Monospace, like
                every other address in this menu. */}
            <Input
                type="url"
                variant="dark"
                className={cn('font-mono text-[11px]', FIELD_MENU_BORDER_CLASSES)}
                aria-label={`Address for ${saved.name || host}`}
                placeholder="Address"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={onKeyDown}
                data-testid={ids.url}
            />
            {error && (
                <span className="text-xs leading-snug text-[#b45be1]" data-testid={ids.error}>
                    {error}
                </span>
            )}
            {/* The form's own answer and dismissal, in words now that they are out of the field: a tick
                reads as an answer only where it sits inside the thing it answers for, and this pair
                answers for the whole form. Left-aligned with the fields above them, Save first, so the
                eye lands on the answer rather than on the way out. Deleting is not here — it is one of
                the row's own controls, where reaching for it costs one click rather than two. */}
            <span className="flex items-center gap-2">
                <Button
                    variant="accent"
                    size="sm"
                    className={MENU_PRIMARY_BUTTON_CLASSES}
                    onClick={commit}
                    title="Save this endpoint"
                    data-testid={ids.confirm}
                >
                    Save
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={MENU_SECONDARY_BUTTON_CLASSES}
                    onClick={onCancel}
                    data-testid={ids.cancel}
                >
                    Cancel
                </Button>
            </span>
        </div>
    );
}

/** Per intent, because the tests that drive the two surfaces address them differently — the row's by
 *  the URL it edits, the field's by what it does. */
const TEST_IDS = {
    create: () => ({
        cancel: 'cancel-save-cluster-btn',
        confirm: 'confirm-save-cluster-btn',
        error: 'save-cluster-error',
        form: 'save-cluster-form',
        name: 'cluster-name-input',
        url: 'save-cluster-url',
    }),
    edit: (url: string) => ({
        cancel: `cancel-rename-cluster-${url}`,
        confirm: `confirm-rename-cluster-${url}`,
        error: `rename-cluster-error-${url}`,
        form: `rename-cluster-form-${url}`,
        name: `rename-cluster-input-${url}`,
        url: `edit-cluster-url-${url}`,
    }),
} satisfies Record<
    'create' | 'edit',
    (url: string) => { cancel: string; confirm: string; error: string; form: string; name: string; url: string }
>;
