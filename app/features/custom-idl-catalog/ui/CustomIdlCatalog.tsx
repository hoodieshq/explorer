'use client';

import { Button } from '@components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/shared/ui/dialog';
import { Input } from '@components/shared/ui/input';
import { Label } from '@components/shared/ui/label';
import {
    buildProgramName,
    CustomIdlForm,
    CustomIdlIntro,
    getIdlBadgeLabel,
    parseDeclaredProgramAddress,
    useAddCustomIdl,
    useProgramIdlPreference,
    useProgramIdlPreferences,
} from '@entities/idl';
import { useCluster } from '@providers/cluster';
import { isAddress } from '@solana/kit';
import { getProgramName } from '@utils/tx';
import { useClusterPath } from '@utils/url';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Edit2, Trash2, X } from 'react-feather';

import { cn } from '@/app/components/shared/utils';
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';
import { Drawer } from '@/app/shared/ui/drawer';

// `new` is the upload form for a program that has no custom IDL yet.
type Selection = string | 'new';

/**
 * Every custom IDL stored in this browser: the programs with an "Upload IDL" item, and the upload dialog's
 * content for the selected program, or for a new one. Side by side in a dialog on wider screens; on phones,
 * a bottom drawer that shows the list, then the picked IDL with the way back at the bottom.
 */
export function CustomIdlCatalog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { isMd } = useBreakpoint();
    const { cluster } = useCluster();
    const preferences = useProgramIdlPreferences();
    const programs = Object.entries(preferences)
        .flatMap(([address, preference]) => (preference.custom ? [{ address, preference }] : []))
        .map(({ address, preference }) => ({
            address,
            name: buildProgramName([preference.custom?.idl]) ?? getProgramName(address, cluster),
        }));
    const [picked, setPicked] = useState<Selection>();
    // The drawer footer's action slot; the detail renders its buttons into it (see `actionsTarget`).
    const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | undefined>();
    const detailActionsTarget = isMd ? undefined : actionsTarget;
    // The drawer's step; the dialog shows both at once and ignores it.
    const [step, setStep] = useState<'list' | 'detail'>('list');
    const openDetail = (next: Selection) => {
        setPicked(next);
        setStep('detail');
    };
    // A removed program falls back to the first one left, or to the upload form.
    const selection: Selection =
        picked === 'new' || programs.some(program => program.address === picked)
            ? (picked as Selection)
            : (programs[0]?.address ?? 'new');

    const title = (className: string) => (
        <>
            <DialogTitle className={cn('m-0 !text-xl !font-medium !leading-snug !text-white', className)}>
                Custom IDLs
            </DialogTitle>
            <DialogDescription className="sr-only">
                Programs decoded with your own IDL in this browser.
            </DialogDescription>
        </>
    );
    const list = <ProgramList programs={programs} selection={isMd ? selection : undefined} onSelect={openDetail} />;
    const detail =
        selection === 'new' ? (
            <NewProgramIdl
                key="new"
                onAdded={setPicked}
                actionsTarget={detailActionsTarget}
                onBack={() => setStep('list')}
            />
        ) : (
            <StoredProgramIdl
                key={selection}
                programAddress={selection}
                programName={programs.find(program => program.address === selection)?.name}
                onNavigate={() => onOpenChange(false)}
                onRemoved={() => setStep('list')}
                actionsTarget={detailActionsTarget}
                onBack={() => setStep('list')}
            />
        );

    if (!isMd) {
        // One drawer for both steps, so a step change swaps its content instead of replaying the slide-in.
        return (
            <Drawer
                open={open}
                onOpenChange={onOpenChange}
                // A fixed height on the program step, so switching to editing does not resize the drawer.
                className={step === 'detail' ? 'h-[85dvh]' : undefined}
                header={step === 'list' ? <div className="px-5 pb-3 pt-2">{title('')}</div> : undefined}
                footer={
                    step === 'detail' ? (
                        <Drawer.Footer>
                            {/* `contents`, so the portalled actions are the footer's own flex items. The panel fills
                                it, Back included, since only the panel knows whether it is editing. */}
                            <div ref={node => setActionsTarget(node ?? undefined)} className="contents" />
                        </Drawer.Footer>
                    ) : undefined
                }
            >
                {step === 'list' ? (
                    <div className="pb-6">{list}</div>
                ) : (
                    <>
                        {title('sr-only')}
                        {/* Positioned, so the form's drop hint frames the panel. */}
                        <section className="relative flex min-w-0 flex-col gap-5 p-5 pt-3">{detail}</section>
                    </>
                )}
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={CONTENT}>
                <div className="grid h-full min-h-0 grid-cols-[220px_1fr] text-left">
                    <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto border-0 border-r border-solid border-outer-space-800 p-5 pt-6">
                        {title('')}
                        {/* Through the column's padding on both sides, so the active band runs from the box edge to
                            the divider while the items' own padding keeps their text on the title's vertical. */}
                        <div className="-mx-5">{list}</div>
                    </div>
                    {/* Positioned, so the form's drop hint frames this column. */}
                    <section className="relative flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto p-5 pt-6">
                        {detail}
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}

type CatalogProgram = { address: string; name: string };

function ProgramList({
    programs,
    selection,
    onSelect,
}: {
    programs: CatalogProgram[];
    /** Undefined in the drawer, where a tap opens the program and the list never shows a selection. */
    selection: Selection | undefined;
    onSelect: (selection: Selection) => void;
}) {
    const selectedState = (item: Selection) => (selection === undefined ? 'none' : selection === item);
    return (
        <nav aria-label="Programs with a custom IDL" className="flex min-w-0 flex-col">
            <button
                type="button"
                aria-current={selection === 'new' ? 'true' : undefined}
                onClick={() => onSelect('new')}
                className={programItemVariants({ className: 'mb-4', selected: selectedState('new') })}
            >
                <span className="text-sm">Upload IDL</span>
            </button>
            {programs.map(program => (
                <button
                    key={program.address}
                    type="button"
                    aria-current={selection === program.address ? 'true' : undefined}
                    onClick={() => onSelect(program.address)}
                    className={programItemVariants({ selected: selectedState(program.address) })}
                >
                    <span className="truncate text-sm">{program.name}</span>
                    <span className="truncate font-mono text-xs text-outer-space-300">
                        {shortAddress(program.address)}
                    </span>
                </button>
            ))}
        </nav>
    );
}

function StoredProgramIdl({
    programAddress,
    programName,
    onNavigate,
    onRemoved,
    actionsTarget,
    onBack,
}: {
    programAddress: string;
    programName: string | undefined;
    onNavigate: () => void;
    onRemoved: () => void;
    /** Back to the drawer's list; editing has no way back but Cancel. */
    onBack: () => void;
    /** The drawer footer, where the actions go as tile buttons; absent in the dialog. */
    actionsTarget?: HTMLElement;
}) {
    const { preference, addCustomIdl, removeCustomIdl } = useProgramIdlPreference(programAddress);
    const idlPath = useClusterPath({ pathname: `/address/${programAddress}/idl` });
    const [isEditing, setIsEditing] = useState(false);
    const jsonLabelId = useId();
    const custom = preference?.custom;
    if (!custom) return undefined;
    const remove = () => {
        removeCustomIdl();
        onRemoved();
    };
    const json = JSON.stringify(custom.idl, undefined, 2);

    return (
        <>
            {/* Clear of the close mark, which sits over this column's top-right corner. */}
            <div className="flex flex-col gap-1 pr-8">
                {/* The page headers' eyebrow ("Program account"), in the design system's grey rather than Dashkit's. */}
                {isEditing && (
                    <span className="text-xs uppercase tracking-[0.08em] text-outer-space-300">Edit IDL</span>
                )}
                <span className="text-sm font-medium text-white">{programName ?? programAddress}</span>
                <Link href={idlPath} onClick={onNavigate} className="w-fit break-all font-mono text-xs">
                    {programAddress}
                </Link>
            </div>
            {isEditing ? (
                <CustomIdlForm
                    programAddress={programAddress}
                    initialText={json}
                    initialFileName={custom.fileName}
                    submitLabel={actionsTarget ? 'Save' : 'Save IDL'}
                    onSubmit={({ text, fileName }) => addCustomIdl(text, fileName)}
                    onSubmitted={() => setIsEditing(false)}
                    actionsTarget={actionsTarget}
                    textRows={actionsTarget ? DRAWER_TEXT_ROWS : undefined}
                    secondaryActions={
                        actionsTarget ? (
                            <Button
                                size="tile"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsEditing(false)}
                            >
                                <X size={18} />
                                Cancel
                            </Button>
                        ) : (
                            <Button size="lg" variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                        )
                    }
                />
            ) : (
                <>
                    {/* Takes the column's free height, so the buttons sit at the bottom and long JSON scrolls inside. The
                        drawer has no fixed height to share, so there the JSON is capped and scrolls inside too. */}
                    <div className="flex min-h-48 flex-1 flex-col gap-1.5">
                        <span id={jsonLabelId} className="text-sm font-medium leading-none text-neutral-200">
                            {getIdlBadgeLabel(custom.idl)}
                        </span>
                        <pre
                            aria-labelledby={jsonLabelId}
                            className="m-0 min-h-0 flex-1 overflow-auto rounded border border-solid border-outer-space-800 bg-heavy-metal-900 p-3 font-mono text-xs text-neutral-200 max-md:max-h-[50dvh]"
                        >
                            {json}
                        </pre>
                    </div>
                    {actionsTarget ? (
                        createPortal(
                            <>
                                <BackTile onBack={onBack} />
                                <Button
                                    size="tile"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit2 size={18} />
                                    Edit
                                </Button>
                                <Button size="tile" variant="outline" className={cn('flex-1', DANGER)} onClick={remove}>
                                    <Trash2 size={18} />
                                    Remove
                                </Button>
                            </>,
                            actionsTarget,
                        )
                    ) : (
                        <div className="mt-auto flex items-center gap-2">
                            <Button size="lg" variant="outline" onClick={() => setIsEditing(true)}>
                                Edit IDL
                            </Button>
                            {/* Apart from the safe actions and in the danger colour: it deletes, it does not go back. */}
                            <Button size="lg" variant="outline" onClick={remove} className={cn('ml-auto', DANGER)}>
                                Remove
                            </Button>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

function NewProgramIdl({
    onAdded,
    actionsTarget,
    onBack,
}: {
    onAdded: (programAddress: string) => void;
    /** Back to the drawer's list. */
    onBack: () => void;
    /** The drawer footer, where the action goes as a tile button; absent in the dialog. */
    actionsTarget?: HTMLElement;
}) {
    const addCustomIdl = useAddCustomIdl();
    const [programAddress, setProgramAddress] = useState('');
    const addressId = useId();

    return (
        <>
            <span className="text-sm font-medium text-white">Upload an IDL</span>
            <p className="m-0 text-[13px] leading-relaxed text-white">
                <CustomIdlIntro />
            </p>
            <CustomIdlForm
                actionsTarget={actionsTarget}
                textRows={actionsTarget ? DRAWER_TEXT_ROWS : undefined}
                secondaryActions={actionsTarget ? <BackTile onBack={onBack} /> : undefined}
                submitLabel={actionsTarget ? 'Add' : 'Add IDL'}
                // Modern Anchor and Codama IDLs carry their program address; older Anchor ones may not.
                afterText={text =>
                    needsProgramAddress(text) && (
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-neutral-200" htmlFor={addressId}>
                                Program address
                            </Label>
                            <Input
                                id={addressId}
                                variant="dark"
                                value={programAddress}
                                onChange={e => setProgramAddress(e.target.value)}
                                spellCheck={false}
                                className="!border-outer-space-800 font-mono"
                            />
                            <p className="m-0 text-xs text-outer-space-300">
                                This IDL doesn&apos;t say which program it is for.
                            </p>
                        </div>
                    )
                }
                onSubmit={({ text, fileName }) => {
                    // The address the IDL declares wins; the field is shown, and read, only when it declares none.
                    const address = parseDeclaredProgramAddress(text) ?? programAddress.trim();
                    if (!address) {
                        return { error: 'Enter the program address: this IDL does not declare one.', ok: false };
                    }
                    if (!isAddress(address)) return { error: `${address} is not a program address.`, ok: false };
                    const result = addCustomIdl({ fileName, programAddress: address, text });
                    if (result.ok) onAdded(address);
                    return result;
                }}
            />
        </>
    );
}

// Valid JSON that names no program. Invalid JSON gets its own error on submit, so the field waits for it.
function needsProgramAddress(text: string): boolean {
    if (!text.trim()) return false;
    try {
        JSON.parse(text);
    } catch {
        return false;
    }
    return parseDeclaredProgramAddress(text) === undefined;
}

// The drawer's program step has a fixed height, with room for a JSON field twice the dialog's.
const DRAWER_TEXT_ROWS = 12;

function BackTile({ onBack }: { onBack: () => void }) {
    return (
        <Button size="tile" variant="outline" className="flex-1" onClick={onBack}>
            <ChevronLeft size={18} />
            Back
        </Button>
    );
}

function shortAddress(address: string): string {
    return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

// The app's danger colour on an outline button: removing a stored IDL cannot be undone.
const DANGER = '!border-destructive !text-destructive hover:!bg-destructive-950';

// The page tabs' colours (grey, white when active), with the active item lit across the whole column.
const programItemVariants = cva(
    'flex w-full min-w-0 flex-col items-start gap-0.5 border-0 px-5 py-2 text-left transition-colors',
    {
        variants: {
            selected: {
                false: 'bg-transparent text-outer-space-200 hover:text-white',
                // The drawer's list: a tap opens the program at once, so nothing is ever selected there.
                none: 'bg-transparent text-white active:bg-outer-space-800',
                true: 'bg-outer-space-800 text-white',
            },
        },
    },
);

// The upload dialog's box (the Interactive IDL mainnet confirmation's), wider for the two columns.
// `!`: the shared DialogContent sets its own box, and this dialog does not change the shared component.
const CONTENT = cn(
    // No padding on the box: the columns carry it, so the divider between them runs from edge to edge.
    '!max-w-3xl !gap-0 !border-outer-space-800 !bg-outer-space-900 !p-0 overflow-hidden',
    // One height for every state, so switching programs or modes does not resize the box. The JSON field
    // shrinks to fit the tallest right column (a new IDL with its address field and an error) without a scroll.
    '!h-[min(520px,calc(100dvh-2rem))]',
    '[&>button:last-child]:!right-3.5 [&>button:last-child]:!top-3.5',
    '[&>button:last-child]:!h-6 [&>button:last-child]:!w-6',
    '[&>button:last-child>svg]:!h-[18px] [&>button:last-child>svg]:!w-[18px]',
);
