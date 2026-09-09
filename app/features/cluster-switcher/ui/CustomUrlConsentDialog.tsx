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
// The mark carries its own weight, so the question wants a little air under it — but less than the pair
// of a title and a caption would want between them, since these two read as one unit.
const HEADER_CLASSES = '!space-y-1.5 !text-left';
const PLATE_CLASSES = 'rounded-md border border-solid border-outer-space-800 bg-heavy-metal-800 p-3 text-left';
const LABEL_CLASSES = 'text-xs uppercase text-outer-space-300';
// `outer-space-300` throughout, the grey the navigation's own links and the cluster panel are set in:
// this dialog is raised from those surfaces, and a shade of its own read as a different family.
const BODY_CLASSES = 'm-0 text-left text-[13px] leading-relaxed text-outer-space-300';
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
const FOOTER_CLASSES = '!flex-row !justify-start gap-2 pt-1 sm:space-x-0';
// The fold can outgrow a short screen, so the reading scrolls and the answer buttons stay where they are.
// Pinning them instead put an opaque row over the last line of what they are the answer to.
//
// The gap before those buttons is this box's own margin, not padding inside it: padding at the end of a
// scrolling box is only ever seen at the very bottom of the scroll, so on a screen that cut the list off
// the answer row still sat flush against it.
const SCROLL_CLASSES = 'mb-5 flex max-h-[60dvh] flex-col gap-2 overflow-y-auto text-left';

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
            <DialogContent
                data-testid="custom-url-consent"
                zIndex={CONSENT_Z_INDEX}
                // Roomier than the default 16px all round, and roomier still above the question: the close
                // mark sits in that corner, and a title level with it reads as crowded by it.
                //
                // Capped and scrollable, because the fold below can double the height: on a short phone the
                // answer buttons would otherwise sit past the bottom of the screen, and this dialog is one
                // nobody should be able to dismiss by accident for want of a visible Cancel.
                // The cards' outline, so the box has an edge of its own against the page behind it — the
                // dialog reserves a border and leaves it transparent by default.
                className="!gap-3 !border-outer-space-800 !p-5 !pt-6"
            >
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

function EndpointConsent({
    endpoint,
    onConfirm,
    onCancel,
}: { endpoint: RpcEndpoint } & Pick<Props, 'onCancel' | 'onConfirm'>) {
    return (
        <>
            <DialogHeader className={HEADER_CLASSES}>
                <DialogTitle>Connect to this RPC server?</DialogTitle>
                <DialogDescription>
                    A link asked the Explorer to load Solana data from a server instead of a public cluster.
                </DialogDescription>
            </DialogHeader>

            {/* The host is the decision, so it gets a plate of its own and a label to say what it is: a
                lookalike domain reads as the real thing inside a sentence. */}
            <div className={PLATE_CLASSES}>
                <div className={LABEL_CLASSES}>Server</div>
                <div className="mt-1 break-all font-mono text-sm text-white" data-testid="consent-host">
                    {endpoint.host}
                </div>
                {endpoint.hasPathOrQuery && (
                    <div
                        className="mt-1 break-all font-mono text-xs text-outer-space-300"
                        data-testid="consent-full-url"
                    >
                        {endpoint.href}
                    </div>
                )}
            </div>

            <p className={BODY_CLASSES}>
                Everything you look up is sent to this server, and the Explorer shows whatever it returns — balances,
                token details and transaction results included. Only continue if you trust whoever gave you the link.
            </p>

            <DialogFooter className={FOOTER_CLASSES}>
                <Button
                    size="lg"
                    variant="accent"
                    className={ACTION_CLASSES}
                    onClick={onConfirm}
                    data-testid="consent-confirm"
                >
                    Connect
                </Button>
                <Button
                    size="lg"
                    variant="outline"
                    className={ACTION_CLASSES}
                    onClick={onCancel}
                    data-testid="consent-cancel"
                >
                    Cancel
                </Button>
            </DialogFooter>
        </>
    );
}

function BypassConsent({ onConfirm, onCancel }: Pick<Props, 'onCancel' | 'onConfirm'>) {
    return (
        <>
            {/* The mark and the colour are the warning — no plate, and no second heading under the first.
                Both sit on the question itself, which is the thing being answered. */}
            <DialogHeader className={HEADER_CLASSES}>
                <AlertTriangle size={24} aria-hidden className="shrink-0 text-dk-danger" />
                <DialogTitle className="!text-lg !font-medium !leading-snug !text-dk-danger">
                    Stop asking about custom RPC servers?
                </DialogTitle>
            </DialogHeader>

            <div className={SCROLL_CLASSES}>
                {/* Who it is for and what it costs, in one paragraph — and the dialog's description besides:
                    Radix wires `aria-describedby` to it, so what a screen reader hears after the question is
                    what is on screen. The whole of it is one fold down, for a reader who wants to know
                    exactly what they are agreeing to. */}
                <DialogDescription className="m-0 !text-[13px] leading-relaxed !text-outer-space-300">
                    Use it only for testing against your own endpoints. Any link you open can then point the Explorer at
                    a server of its choosing, without asking you first.
                </DialogDescription>

                <details className={DETAILS_CLASSES}>
                    <summary className={SUMMARY_CLASSES}>
                        <ChevronRight size={14} aria-hidden className="shrink-0 transition-transform" />
                        What a server chosen this way can do
                    </summary>
                    <ul className={cn('m-0 mt-2 flex list-disc flex-col gap-1.5 pl-8', FOLD_TEXT_CLASSES)}>
                        <li>
                            See your address, the time, and every account, signature, token and block you look at — one
                            visit to your own wallet ties the two together.
                        </li>
                        <li>
                            Answer with whatever it likes: balances, account owners, token details, the status of a
                            transaction. The page shows what it returns, so a payment can be made to look settled.
                        </li>
                        <li>Leave things out — a transaction, an instruction, an account — which reads as absence.</li>
                        <li>
                            Shape what you are about to sign: the account data and the simulation an interactive IDL
                            shows you come from it, and it receives the signed transaction before the network does.
                        </li>
                    </ul>
                    <p className={cn('m-0 mt-2 pl-8', FOLD_TEXT_CLASSES)}>
                        It never sees your keys, and nothing is signed without your wallet asking you first.
                    </p>
                </details>
            </div>

            <DialogFooter className={FOOTER_CLASSES}>
                {/* First and filled green: keeping the warning is the outcome the dialog is steering towards,
                    so the safe answer stands where the eye lands and looks like the answer. */}
                <Button
                    size="lg"
                    variant="accent"
                    className={ACTION_CLASSES}
                    onClick={onCancel}
                    data-testid="consent-cancel"
                >
                    Keep warning
                </Button>
                <Button
                    size="lg"
                    variant="destructive"
                    className={cn(ACTION_CLASSES, DANGER_CLASSES)}
                    onClick={onConfirm}
                    data-testid="consent-confirm"
                >
                    Turn off warnings
                </Button>
            </DialogFooter>
        </>
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
