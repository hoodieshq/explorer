'use client';

import { Button } from '@components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@components/shared/ui/dialog';
import { cn } from '@components/shared/utils';
import type { RpcEndpoint } from '@entities/cluster';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useRef } from 'react';
import { AlertTriangle, ChevronRight } from 'react-feather';

// Two things share this dialog: a link supplying an endpoint nobody has agreed to, and the developer
// toggle that stops asking altogether.
export type ConsentRequest = { kind: 'endpoint'; endpoint: RpcEndpoint } | { kind: 'developer-bypass' };

// Above every layer the app can put on screen: the nickname editor and the popover surface are the
// tallest at `z-[1203]` and `z-[1202]`, over the slideover at 1201 and the legacy dashkit sidebar at
// 1060. This dialog asks a security question and is raised from inside those surfaces — the
// developer-bypass toggle sits in the cluster switcher, which renders as a sidebar in one place and as a
// popover in another — so anything it can be opened from has to end up beneath it.
const CONSENT_Z_INDEX = 1210;

/**
 * One setting per role, so the dialog reads top to bottom rather than as one grey block: the title asks,
 * the description says what happened, the plate carries the fact the answer turns on, and the paragraph
 * spells out the consequence. The body copy is deliberately smaller than the question — before this it was
 * the largest thing in the box.
 *
 * Everything is ranged left, the actions included: the dialog is read from the left edge, and buttons that
 * sit against the opposite one make the eye cross the box to answer the question it just read.
 */
// The chosen row's plate from the cluster menu (`ACTIVE_ROW_CLASSES`), since this box stands on that menu's
// ground: a step up from it, edged in the same translucent white.
const PLATE_CLASSES = 'rounded-md border border-solid border-white/10 bg-outer-space-800 p-3 text-left';
const LABEL_CLASSES = 'text-xs uppercase text-outer-space-300';
// The shared button's focus ring is near-black with an offset, which on this ground reads as a hole
// punched around the button. Same ring, in the accent, tight to the edge.
const ACTION_CLASSES = 'focus-visible:!ring-1 focus-visible:!ring-accent focus-visible:!ring-offset-0';
// The app's own error colour rather than the button's stock red: every other failing state in the Explorer
// — a cluster that will not connect, a danger badge — is this purple.
const DANGER_CLASSES = '!bg-dk-danger hover:!bg-dk-danger/90';
// A fold rather than a wall of text: the line is the whole warning for most readers, and the list is
// there for the one who wants to know exactly what they are agreeing to before answering.
//
// `details`, and not the shared `Accordion`: that one is built for the head of a card section, so its
// rule, its side padding, its weight and its underline all had to be switched off one at a time here, and
// what came out still sat unevenly against the paragraph above. This is three lines of CSS and lines up.
const DETAILS_CLASSES = 'text-left [&[open]]:pb-2 [&[open]_svg]:rotate-90';
const SUMMARY_CLASSES = cn(
    'flex cursor-pointer list-none items-center gap-1.5 text-[13px] text-outer-space-300',
    'transition-colors hover:text-white [&::-webkit-details-marker]:hidden',
);
/** One setting for everything the fold holds: the closing line used to be a shade dimmer than the list,
 *  which read as a footnote to a footnote. */
const FOLD_TEXT_CLASSES = 'text-[13px] leading-relaxed text-outer-space-300';
// Pinned to the bottom of the box: the fold above can outgrow a short screen, and an answer the reader
// has to scroll to find is an answer they may give by pressing Escape instead.
// `!space-x-0`: the shared footer adds `sm:space-x-1` of its own, and without the `!` the two utilities are
// settled by emission order — which put 4px of margin on top of the 8px gap.
const FOOTER_CLASSES = '!flex-row !justify-start gap-2 pt-1 sm:!space-x-0';
// The fold can outgrow a short screen, so the reading scrolls and the answer buttons stay where they are.
// Pinning them instead put an opaque row over the last line of what they are the answer to.
//
// The gap before those buttons is this box's own margin, not padding inside it: padding at the end of a
// scrolling box is only ever seen at the very bottom of the scroll, so on a screen that cut the list off
// the answer row still sat flush against it.
const SCROLL_CLASSES = 'mb-5 flex max-h-[60dvh] flex-col gap-2 overflow-y-auto text-left';
// This dialog's own take on the shared box. Roomier than the default 16px all round, and roomier still
// above the question: the close mark sits in that corner, and a title level with it reads as crowded by
// it. The cluster menu's own ground and edge (`PopoverContent`): both questions are raised from that menu
// or about what it controls, and the shared box's `neutral-800` was a warmer grey from another family.
const CONTENT_CLASSES = '!gap-3 !border-outer-space-800 !bg-outer-space-900 !p-5 !pt-6';

type Props = {
    request: ConsentRequest | undefined;
    onConfirm: () => void;
    onCancel: () => void;
};

export function CustomUrlConsentDialog({ request, onConfirm, onCancel }: Props) {
    // What the dialog shows, which outlives what it is asking: the same `undefined` that closes it would
    // otherwise blank the body, and the content stays on screen for the whole exit animation.
    const shown = useRetainedRequest(request);

    // Anything that closes the dialog — Escape, the X, Cancel, a click outside — is a decline: the safe
    // outcome is the default one, so there is no way to leave the box that agrees to anything.
    return (
        <Dialog open={request !== undefined} onOpenChange={open => !open && onCancel()}>
            <DialogContent data-testid="custom-url-consent" zIndex={CONSENT_Z_INDEX} className={CONTENT_CLASSES}>
                {/* Per kind, never a two-way ternary: the request the dialog closed on is `undefined`, and an
                    `else` branch would answer one question with the other one's copy. */}
                {shown?.kind === 'endpoint' ? (
                    <EndpointConsent endpoint={shown.endpoint} onConfirm={onConfirm} onCancel={onCancel} />
                ) : shown?.kind === 'developer-bypass' ? (
                    <BypassConsent onConfirm={onConfirm} onCancel={onCancel} />
                ) : undefined}
            </DialogContent>
        </Dialog>
    );
}

/**
 * The two questions share one shape — the warning mark and the question on a line, a short white
 * statement of what is at stake, a fold for the reader who wants the whole of it, then the answer in the
 * warning's colour with the way out beside it in quieter grey. They used to be two designs: one asked in
 * green with a neutral heading, the other in the warning colour, and the same kind of decision looked
 * like two different kinds. What differs now is only what each has to show — the endpoint question puts
 * the server on a plate, since the host *is* the decision — and the words.
 */
function WarningHeader({ question }: { question: string }) {
    // The mark and the colour are the warning — no plate, and no second heading under the first. Both sit
    // on the question itself, which is the thing being answered: the mark leads the question the way the
    // provenance mark leads a network's name in the bar, rather than standing over it as a heading of its
    // own. And it is *in* the question, as its first glyph, not a column beside it: a question that wraps
    // on a phone runs its second line back under the mark, as any text would, instead of leaving it
    // indented beside a mark that hangs in a column of its own.
    //
    // `align-[-0.2em]` sits the 24px mark on the text's baseline the way a large glyph would — its box is
    // taller than the x-height it stands beside, so a plain `middle` lifted it off the line.
    return (
        <DialogHeader className="!space-y-0 !text-left">
            <DialogTitle className="!text-xl !font-medium !leading-snug !text-dk-danger">
                <AlertTriangle size={24} aria-hidden className="mr-2 inline-block align-[-0.2em]" />
                {question}
            </DialogTitle>
        </DialogHeader>
    );
}

/** What is at stake, in a line or two — and the dialog's description besides: Radix wires
 *  `aria-describedby` to it, so what a screen reader hears after the question is what is on screen. White,
 *  unlike the fold below it: this is the one line that has to be read before answering, and the grey the
 *  rest of the box is set in made it look like the fine print. */
function Stakes({ children }: { children: React.ReactNode }) {
    return <DialogDescription className="m-0 !text-[13px] leading-relaxed !text-white">{children}</DialogDescription>;
}

/** What a server the reader did not choose can do to what they see and sign, one fold down. The same
 *  list under both questions, since it is the same server either way — chosen once by a link, or by every
 *  link from now on; only the summary line names which. */
function ServerPowersFold({ summary }: { summary: string }) {
    return (
        <details className={DETAILS_CLASSES}>
            <summary className={SUMMARY_CLASSES}>
                <ChevronRight size={14} aria-hidden className="shrink-0 transition-transform" />
                {summary}
            </summary>
            <ul className={cn('m-0 mt-2 flex list-disc flex-col gap-1.5 pl-8', FOLD_TEXT_CLASSES)}>
                <li>
                    See your address, the time, and every account, signature, token and block you look at — one visit to
                    your own wallet ties the two together.
                </li>
                <li>
                    Answer with whatever it likes: balances, account owners, token details, the status of a transaction.
                    The page shows what it returns, so a payment can be made to look settled.
                </li>
                <li>Leave things out — a transaction, an instruction, an account — which reads as absence.</li>
                <li>
                    Shape what you are about to sign: the account data and the simulation an interactive IDL shows you
                    come from it, and it receives the signed transaction before the network does.
                </li>
            </ul>
            <p className={cn('m-0 mt-2 pl-8', FOLD_TEXT_CLASSES)}>
                It never sees your keys, and nothing is signed without your wallet asking you first.
            </p>
        </details>
    );
}

/** The answer to the question first, in the warning's own colour; the way out second, the plain outlined
 *  button. The reader arrived by doing something — opening a link, turning a switch on — so the box
 *  answers that and does not dress declining up as the primary action; declining stays one click away and
 *  is still what Escape and the X do. */
function Actions({
    cancelLabel,
    confirmLabel,
    onCancel,
    onConfirm,
}: { cancelLabel: string; confirmLabel: string } & Pick<Props, 'onCancel' | 'onConfirm'>) {
    return (
        <DialogFooter className={cn(FOOTER_CLASSES, '!items-center')}>
            <Button
                size="lg"
                variant="destructive"
                className={cn(ACTION_CLASSES, DANGER_CLASSES)}
                onClick={onConfirm}
                data-testid="consent-confirm"
            >
                {confirmLabel}
            </Button>
            <Button
                size="lg"
                variant="outline"
                className={ACTION_CLASSES}
                onClick={onCancel}
                data-testid="consent-cancel"
            >
                {cancelLabel}
            </Button>
        </DialogFooter>
    );
}

function EndpointConsent({
    endpoint,
    onConfirm,
    onCancel,
}: { endpoint: RpcEndpoint } & Pick<Props, 'onCancel' | 'onConfirm'>) {
    return (
        <>
            {/* "Unknown", the word the bar's provenance stamp uses for exactly this server, so the box and
                the chip it is about to light amber say the same thing. */}
            <WarningHeader question="Connect to an unknown RPC server?" />

            <div className={SCROLL_CLASSES}>
                <Stakes>
                    A link asked the Explorer to read its data from this server instead of a public cluster. Connect
                    only if you trust whoever sent the link.
                </Stakes>

                {/* The server is the decision, so it gets a plate of its own and a label to say what it is: a
                    lookalike domain reads as the real thing inside a sentence. The whole address, once, in
                    the plate's one voice — it used to be the host in white over the full URL in grey fine
                    print, and the two lines said one thing twice. */}
                <div className={PLATE_CLASSES}>
                    <div className={LABEL_CLASSES}>Server</div>
                    <div className="mt-1 break-all font-mono text-sm text-white" data-testid="consent-host">
                        {endpoint.href}
                    </div>
                </div>

                <ServerPowersFold summary="What this server can do" />
            </div>

            {/* "Reject", not "Cancel": there is nothing being cancelled — the link's choice of server is
                being turned down, and the page goes on with the public cluster instead. */}
            <Actions confirmLabel="Connect" cancelLabel="Reject" onConfirm={onConfirm} onCancel={onCancel} />
        </>
    );
}

function BypassConsent({ onConfirm, onCancel }: Pick<Props, 'onCancel' | 'onConfirm'>) {
    return (
        <>
            {/* Asked in the switch's own words — "Trust any RPC server" — with the question mark that turns
                the setting's name into the question about it, the way the endpoint box asks about its
                server. It once asked about "warnings", which read as a different question about a switch
                the reader had turned on, not off. */}
            <WarningHeader question="Trust any RPC server?" />

            <div className={SCROLL_CLASSES}>
                <Stakes>
                    Any link could then point the Explorer at its own RPC server, with no question asked. Only for
                    testing your own endpoints.
                </Stakes>
                <ServerPowersFold summary="What a server chosen this way can do" />
            </div>

            <Actions confirmLabel="Trust" cancelLabel="Keep asking" onConfirm={onConfirm} onCancel={onCancel} />
        </>
    );
}

/**
 * For the review harness (`/nav-preview/consent-dialogs`): one request's box, laid out in flow — no
 * overlay, no portal, no motion, no dismissal — so the two questions this dialog can ask can stand side
 * by side and be compared. The real dialog is what renders it: the same `EndpointConsent` and
 * `BypassConsent`, inside a Radix root so their title and description have the context they expect, in
 * the box the shared `DialogContent` draws (its classes repeated here, since that component always
 * portals to `body` and pins itself to the viewport's centre). The close mark is left out — it is the
 * shell's, not the content's, and there is nothing to close.
 */
export function CustomUrlConsentPreview({ request }: { request: ConsentRequest }) {
    const noop = () => undefined;
    return (
        <DialogPrimitive.Root open modal={false}>
            <DialogPrimitive.Content
                onOpenAutoFocus={event => event.preventDefault()}
                className={cn(
                    'relative grid w-full max-w-sm gap-4 border border-solid border-transparent bg-neutral-800 p-4 shadow-lg sm:rounded-lg',
                    CONTENT_CLASSES,
                )}
                data-testid={`consent-preview-${request.kind}`}
            >
                {request.kind === 'endpoint' ? (
                    <EndpointConsent endpoint={request.endpoint} onConfirm={noop} onCancel={noop} />
                ) : (
                    <BypassConsent onConfirm={noop} onCancel={noop} />
                )}
            </DialogPrimitive.Content>
        </DialogPrimitive.Root>
    );
}

// Radix keeps the content mounted until the exit animation ends (`duration-200` on `DialogContent`), so the
// request has to outlive the prop that cleared it. Retaining it also keeps the endpoint's host on screen
// while the box fades, rather than collapsing it onto nothing.
function useRetainedRequest(request: ConsentRequest | undefined) {
    const retained = useRef(request);
    if (request !== undefined) retained.current = request;
    return retained.current;
}
