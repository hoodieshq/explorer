'use client';

import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { cva } from 'class-variance-authority';
import { useAtom } from 'jotai';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { DesignMenuOptions, DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

import {
    BASE_PRESET_NUMBER,
    DEFAULT_EXTENSION_DESIGN,
    EXTENSION_ACTIONS_BOTTOMS,
    EXTENSION_FIELDS_GAPS,
    EXTENSION_FIELDS_INDENTS,
    EXTENSION_FIELDS_INNER_PADDINGS,
    EXTENSION_FIELDS_SPACES,
    extensionActionsBottomAtom,
    extensionActionsPlacementAtom,
    type ExtensionDesign,
    type ExtensionFieldsBorder,
    extensionFieldsBorderAtom,
    extensionFieldsDividersAtom,
    extensionFieldsGapAtom,
    extensionFieldsIndentActionsAtom,
    extensionFieldsIndentAtom,
    extensionFieldsInnerAtom,
    extensionFieldsSpaceAtom,
    extensionSettingsOpenAtom,
    LEFT_BORDER_DEFAULT_INDENT,
    sameExtensionDesign,
    savedDesignLabel,
    type SavedExtensionDesign,
    savedExtensionDesignsAtom,
    selectedExtensionDesignAtom,
    storablePresets,
    withBasePreset,
} from './design-variant';

// REVIEW(HOO-935): the design menu's configurator for an open token extension; remove with the menu. On top, the
// base preset, which cannot be deleted, then the presets saved here: a click applies and picks one, a double click renames it, and a star marks the picked one while
// the settings on screen differ from it. Under them the settings, folded away, ending with writing them back into
// the picked preset, saving them as a new one and deleting the picked one.

export function TokenExtensionsDesignSection() {
    const [gap, setGap] = useAtom(extensionFieldsGapAtom);
    const [indent, setIndent] = useAtom(extensionFieldsIndentAtom);
    const [border, setBorder] = useAtom(extensionFieldsBorderAtom);
    const [dividers, setDividers] = useAtom(extensionFieldsDividersAtom);
    const [space, setSpace] = useAtom(extensionFieldsSpaceAtom);
    const [inner, setInner] = useAtom(extensionFieldsInnerAtom);
    const [indentActions, setIndentActions] = useAtom(extensionFieldsIndentActionsAtom);
    const [placement, setPlacement] = useAtom(extensionActionsPlacementAtom);
    const [actionsBottom, setActionsBottom] = useAtom(extensionActionsBottomAtom);
    const [stored, setStored] = useAtom(savedExtensionDesignsAtom);
    const saved = withBasePreset(stored);
    // Every change below writes the whole list back; the base preset goes with it only once it is touched.
    const setSaved = (presets: SavedExtensionDesign[]) => setStored(storablePresets(presets));
    const [settingsOpen, setSettingsOpen] = useAtom(extensionSettingsOpenAtom);
    const [selectedNumber, setSelectedNumber] = useAtom(selectedExtensionDesignAtom);

    // The left border always comes with an indent: picking it over a 0 indent sets the default one, and 0 leaves the
    // indent options while it is on.
    const pickBorder = (next: ExtensionFieldsBorder) => {
        setBorder(next);
        if (next === 'left' && indent === '0') setIndent(LEFT_BORDER_DEFAULT_INDENT);
    };
    const indentOptions = EXTENSION_FIELDS_INDENTS.filter(value => border !== 'left' || value !== '0');

    const current: ExtensionDesign = {
        actionsBottom,
        border,
        dividers,
        gap,
        indent,
        indentActions,
        inner,
        placement,
        space,
    };
    // A preset saved before a setting existed takes that setting's default.
    const complete = (design: SavedExtensionDesign): ExtensionDesign => ({ ...DEFAULT_EXTENSION_DESIGN, ...design });
    const matches = (design: SavedExtensionDesign) => sameExtensionDesign(complete(design), current);
    // Before any pick (a fresh browser), or after the picked preset is deleted, the base preset is the picked one.
    const selected = saved.find(design => design.number === selectedNumber) ?? saved[0];
    const modified = selected !== undefined && !matches(selected);
    const duplicate = saved.some(matches);

    const applyPreset = (design: SavedExtensionDesign) => {
        setSelectedNumber(design.number);
        const next = complete(design);
        setGap(next.gap);
        setIndent(next.indent);
        setBorder(next.border);
        setDividers(next.dividers);
        setSpace(next.space);
        setInner(next.inner);
        setIndentActions(next.indentActions);
        setPlacement(next.placement);
        setActionsBottom(next.actionsBottom);
    };
    // A new preset takes the number after the highest one, so the others keep theirs when one is deleted.
    const saveAsNew = () => {
        const number = Math.max(0, ...saved.map(design => design.number)) + 1;
        setSaved([...saved, { ...current, number }]);
        setSelectedNumber(number);
    };
    // The picked preset takes the settings on screen and keeps its number and name.
    const updateSelected = () =>
        setSaved(
            saved.map(design =>
                design.number === selected?.number ? { ...current, name: design.name, number: design.number } : design,
            ),
        );
    const deleteSelected = () => {
        setSaved(saved.filter(design => design.number !== selected?.number));
        setSelectedNumber(BASE_PRESET_NUMBER);
    };
    // An empty name gives the preset back its number.
    const renamePreset = (number: number, name: string) =>
        setSaved(
            saved.map(design => (design.number === number ? { ...design, name: name.trim() || undefined } : design)),
        );

    return (
        <DesignMenuSection title="Extension fields">
            <MenuLabel>Presets</MenuLabel>
            {/* Three chips to a line, as `DesignMenuOptions`' grid. */}
            <div className="grid grid-cols-3 gap-2">
                {saved.map(design => (
                    <PresetCard
                        key={design.number}
                        design={design}
                        primary={design.number === BASE_PRESET_NUMBER}
                        active={design.number === selected?.number}
                        modified={design.number === selected?.number && modified}
                        onApply={() => applyPreset(design)}
                        onRename={name => renamePreset(design.number, name)}
                    />
                ))}
            </div>
            {/* The legend of the other branches' design menus (HOO-929). */}
            <p className="m-0 text-xs text-outer-space-300">
                <span className="text-dark-accent">★</span> — primary
            </p>

            <button
                type="button"
                aria-expanded={settingsOpen}
                className="flex items-center justify-between border-0 bg-transparent p-0 pt-1 text-xs text-neutral-200"
                onClick={() => setSettingsOpen(!settingsOpen)}
            >
                Settings
                <ChevronDown
                    size={14}
                    className={cn('transition-transform duration-200', settingsOpen ? 'rotate-180' : 'rotate-0')}
                />
            </button>
            {settingsOpen && (
                <div className="flex flex-col gap-2">
                    <MenuLabel>Gap between rows, px</MenuLabel>
                    <DesignMenuOptions
                        layout="grid"
                        options={EXTENSION_FIELDS_GAPS.map(value => ({ label: value, value }))}
                        value={gap}
                        onChange={setGap}
                    />
                    {/* The full frame takes no indent, so these settings leave the menu while it is on. */}
                    {border !== 'all' && (
                        <>
                            <MenuLabel>Left indent, px{border === 'left' && ' (the left border needs one)'}</MenuLabel>
                            <DesignMenuOptions
                                layout="grid"
                                options={indentOptions.map(value => ({ label: value, value }))}
                                value={indent}
                                onChange={setIndent}
                            />
                            <DesignMenuSwitch
                                label="Indent Raw and Docs too"
                                checked={indentActions}
                                onCheckedChange={setIndentActions}
                            />
                        </>
                    )}
                    <MenuLabel>Border</MenuLabel>
                    <DesignMenuOptions
                        options={[
                            { label: 'None', value: 'none' },
                            { label: 'Left', value: 'left' },
                            { label: 'All', value: 'all' },
                        ]}
                        value={border}
                        onChange={pickBorder}
                    />
                    {/* Padding inside the frame means nothing without one, so it shows with the full border only. */}
                    {border === 'all' && (
                        <>
                            <MenuLabel>Padding inside the border, px</MenuLabel>
                            <DesignMenuOptions
                                layout="grid"
                                options={EXTENSION_FIELDS_INNER_PADDINGS.map(value => ({ label: value, value }))}
                                value={inner}
                                onChange={setInner}
                            />
                        </>
                    )}
                    <DesignMenuSwitch label="Row dividers" checked={dividers} onCheckedChange={setDividers} />
                    <MenuLabel>Space above and below the fields, px</MenuLabel>
                    <DesignMenuOptions
                        layout="grid"
                        options={EXTENSION_FIELDS_SPACES.map(value => ({ label: value, value }))}
                        value={space}
                        onChange={setSpace}
                    />
                    <MenuLabel>Raw and Docs</MenuLabel>
                    <DesignMenuOptions
                        options={[
                            { label: 'Above', value: 'above' },
                            { label: 'Below', value: 'below' },
                            { label: 'In table', value: 'column' },
                        ]}
                        value={placement}
                        onChange={setPlacement}
                    />
                    {/* Only buttons under the fields close the open part, so only they have space under them. */}
                    {placement === 'below' && (
                        <>
                            <MenuLabel>Space under Raw and Docs, px</MenuLabel>
                            <DesignMenuOptions
                                layout="grid"
                                options={EXTENSION_ACTIONS_BOTTOMS.map(value => ({ label: value, value }))}
                                value={actionsBottom}
                                onChange={setActionsBottom}
                            />
                        </>
                    )}
                    {/* Update needs a picked preset the settings differ from; Save as new waits while they match one
                        already; Delete needs a picked preset other than the base one. */}
                    <div className="flex gap-2 pt-1">
                        <Button
                            className="flex-1"
                            size="sm"
                            variant="outline"
                            disabled={!modified}
                            aria-label={selected ? `Update ${savedDesignLabel(selected)}` : 'Update preset'}
                            onClick={updateSelected}
                        >
                            Update
                        </Button>
                        <Button className="flex-1" size="sm" variant="outline" disabled={duplicate} onClick={saveAsNew}>
                            Save as new
                        </Button>
                        <Button
                            className="flex-1"
                            size="sm"
                            variant="outline"
                            disabled={!selected || selected.number === BASE_PRESET_NUMBER}
                            aria-label={selected ? `Delete ${savedDesignLabel(selected)}` : 'Delete preset'}
                            onClick={deleteSelected}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            )}
        </DesignMenuSection>
    );
}

// A saved preset: a click applies and picks it; a double click turns it into a name field, kept with Enter or a click away and
// dropped with Escape.
function PresetCard({
    active,
    design,
    modified,
    primary,
    onApply,
    onRename,
}: {
    active: boolean;
    design: SavedExtensionDesign;
    // The settings on screen differ from this picked preset: the star asks for Update or Save as new.
    modified: boolean;
    // The base preset, the one the team prefers so far.
    primary: boolean;
    onApply: () => void;
    onRename: (name: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    // Escape leaves without the blur that would otherwise keep the typed name.
    const cancelled = useRef(false);

    useEffect(() => {
        if (!editing) return;
        cancelled.current = false;
        inputRef.current?.focus();
        inputRef.current?.select();
    }, [editing]);

    if (editing) {
        return (
            <input
                ref={inputRef}
                aria-label="Preset name"
                defaultValue={savedDesignLabel(design)}
                className="h-7 w-full min-w-0 rounded border border-solid border-outer-space-700 bg-outer-space-950 px-2 text-xs text-white outline-none"
                onBlur={event => {
                    if (!cancelled.current) onRename(event.currentTarget.value);
                    setEditing(false);
                }}
                onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') {
                        cancelled.current = true;
                        event.currentTarget.blur();
                    }
                }}
            />
        );
    }

    return (
        <Button
            size="sm"
            variant={active ? 'default' : 'outline'}
            aria-pressed={active}
            title={`${savedDesignLabel(design)}: double-click to rename`}
            className="w-full min-w-0"
            onClick={onApply}
            onDoubleClick={() => setEditing(true)}
        >
            {/* The primary preset reads like `DesignMenuOptions`' primary option: its label and a star in the brand
                green, the button itself plain. The color sits on a span: the button's own text color would win
                against a className. A long name is cut short with an ellipsis; its full text stays in the title. */}
            <span className={labelVariants({ primary })}>
                <span className="truncate">{savedDesignLabel(design)}</span>
                {primary && (
                    <>
                        <span aria-hidden>★</span>
                        <span className="sr-only">(primary)</span>
                    </>
                )}
            </span>
            {/* A visual hint only: the button keeps its name, and an enabled Update says the same. */}
            {modified && <span aria-hidden>*</span>}
        </Button>
    );
}

const labelVariants = cva('inline-flex min-w-0 items-center gap-2', {
    variants: { primary: { false: '', true: 'text-dark-accent' } },
});

function MenuLabel({ children }: { children: ReactNode }) {
    return <span className="pt-1 text-xs text-neutral-200">{children}</span>;
}
