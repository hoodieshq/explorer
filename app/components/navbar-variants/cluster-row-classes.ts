import { cn } from '@components/shared/utils';

/**
 * The dropdown's row treatment, in one place because three files now render one: the cluster rows and the
 * Custom row (`ClusterDropdownBody`) and the saved endpoints (`SavedEndpointRow`).
 *
 * Set as a search result is (`SearchResultItem`): the thing a row *names* — a cluster, an endpoint — is
 * white 14px medium, and anything the row says *about* it (the host, the connection's facts) is the grey
 * fine print underneath. Both lists answer "which of these do you mean?", and in a uniform grey the name
 * and the address weighed the same.
 *
 * Which row is in use is therefore said by the fill and the rule alone, not by the type. That is also the
 * fix for a hover that used to turn a row white: white was the selection's own signal, hover already
 * borrowed the selection's fill, and so every row the cursor crossed read as the chosen one.
 *
 * Every hover rule here is behind `@media (hover: hover)`, and only here rather than through Tailwind's
 * global flag: a touch screen emulates hover, spending the first tap on painting it, so a row took two
 * taps to choose. Scoped to this menu, nothing else in the app changes its behaviour.
 *
 * Hover is the whole plate a search result takes under the cursor — the fill *and* the rule. In that list
 * the two look alike because `cmdk` moves its selection with the pointer, so a hovered result is a
 * selected result; the rule is not a second signal there, it is the same one. The rule is still reserved
 * transparent on every row, so nothing shifts by a pixel as the cursor moves.
 *
 * `hover:text-white` is not a colour change, it holds the colour: `styles.css` carries dashkit's
 * `a:hover { color: #2b8a6e }`, and an element rule with a pseudo-class (0,1,1) outweighs a plain
 * `.text-white` (0,1,0) — so every row that is a link turned link-green under the cursor while the
 * search results, being divs, never did. A `hover:` utility is a class plus a pseudo-class (0,2,0), which
 * is what wins.
 */
const ROW_BASE =
    'flex w-full cursor-pointer justify-between gap-3 rounded-md border border-solid px-3 py-2 text-sm font-medium text-white no-underline transition-colors [@media(hover:hover)]:hover:border-white/10 [@media(hover:hover)]:hover:bg-outer-space-800 [@media(hover:hover)]:hover:text-white';

/** A one-line row: its contents sit on the same line as its trailing controls. */
export const ROW_CLASSES = cn(ROW_BASE, 'items-center');

/**
 * For a row whose trailing controls sit *over* it rather than inside its link: the fill follows the whole
 * row (`group/row`) instead of the link alone.
 *
 * Without it, moving the cursor the last few pixels onto the pencil took it off the link, the link lost
 * `:hover`, and the row went flat under a cursor that was still plainly on it — the controls appeared to
 * push the row away. They are siblings of the link, not children, because a button inside an anchor is
 * neither valid nor operable, so the state has to be read from the ancestor they share.
 */
export const ROW_HOVER_FROM_GROUP =
    '[@media(hover:hover)]:group-hover/row:border-white/10 [@media(hover:hover)]:group-hover/row:bg-outer-space-800';

/**
 * A row that can run to three lines — a saved endpoint's name, its host and, when it is the one in use,
 * the connection's facts. Alignment is baked in rather than added by the caller: `cn` is clsx-only, so an
 * `items-start` passed alongside the base's `items-center` would be decided by Tailwind's emission order,
 * which puts `items-center` last and wins.
 */
export const STACKED_ROW_CLASSES = cn(ROW_BASE, 'items-start');

// The rule is what tells the chosen row from a row merely under the cursor — both carry the same fill, and
// on this ground a fill alone is a faint difference. Every row reserves the border, transparent when it is
// not the chosen one, so nothing shifts by a pixel as the choice moves.
// Translucent white, not a palette step: `outer-space-700` is the next step up and reads as a hard rule,
// while the palette is written in `oklch(...)` strings that Tailwind cannot thin with a `/50`, so the
// modifier silently drops the class and the border falls back to `currentColor`.
/** The fill and the rule; the type is already white on every row. */
export const ACTIVE_ROW_CLASSES = 'border-white/10 bg-outer-space-800';
/**
 * `bg-transparent` is not decoration, it is the fix for a `<button>` row rendering as a white slab on this
 * dark ground: `styles.css` reverts the button box model back to UA chrome (`background-color: revert`),
 * because Preflight's reset would otherwise strip the app's legacy dashkit buttons. A row that names no
 * background of its own therefore inherits `ButtonFace`. Anchors have no UA background, which is why the
 * rows only turned white once picking one became a button rather than a link.
 *
 * It lives here rather than in `ROW_BASE` on purpose: `cn` is clsx-only, so a base `bg-transparent`
 * alongside the active row's `bg-outer-space-800` would be settled by Tailwind's emission order. These two
 * are mutually exclusive, so nothing has to be settled. The hover fill still wins over it — a `hover:`
 * utility carries a pseudo-class on top of its class.
 */
export const INACTIVE_ROW_CLASSES = 'border-transparent bg-transparent';

/** The card tables' column headers, as the transaction page sets them, so the panel's headings read as the
 *  page's do — 12px caps in `outer-space-300`, not the legacy `<table>` head's 10px dashkit type. */
export const CAPTION_CLASSES = 'text-xs font-normal uppercase text-outer-space-300';

/**
 * The Custom choice while it is the one in use: not a row but a plate, holding the name of the choice and
 * the field that belongs to it on one ground. The field used to sit outside the fill, which made it look
 * like a section that merely followed the row rather than the equipment *of* it.
 *
 * The label stays a link inside the plate — an `<input>` inside an anchor is neither valid nor operable —
 * so the two are siblings on one ground rather than one inside the other, and the fill and the rule are
 * the plate's. `pb-3` against `pt-2`: the sides are 12px, and 8px under the field left it looking pushed
 * against the floor, while the top has to stay where an unfolded row's first line was.
 */
export const CUSTOM_PLATE_CLASSES = 'flex w-full flex-col gap-1.5 rounded-md border border-solid px-3 pb-3 pt-2';

/**
 * A plate around the endpoint field, the same box a row of text gets: same radius, same 1px rule, same
 * 12/8 padding, same full width. Only the box is borrowed — the field inside it stays exactly as the
 * design system draws it, its own border, radius and focus ring included.
 *
 * That is the point of doing it this way. Overriding the field to *become* the outline meant fighting the
 * component: a ring is drawn outside the border, so matching the rows' single 1px line by adding a ring
 * gave two lines, and matching it by suppressing the ring left the field with no focus mark of its own.
 * A plate around it needs neither compromise — the menu says "this is the chosen one" in its own language,
 * on its own element, and the field goes on behaving like every other field in the app.
 *
 * Pair it with `ACTIVE_ROW_CLASSES` / `INACTIVE_ROW_CLASSES`, exactly as a row is.
 */
export const FIELD_PLATE_CLASSES = 'flex w-full flex-col gap-1.5 rounded-md border border-solid px-3 py-2';

/**
 * The field's focus mark, quieted for a menu — thinner, not recoloured. The design system announces focus
 * with a 2px ring in the brand accent held 2px clear of the box; in a 360px popover that halo was the
 * brightest thing on screen. One pixel, tight to the edge, in the same accent: the app's focus colour is
 * part of how focus is recognised, so what changes is the weight and not the hue.
 *
 * Only the ring is touched; the field's own border, radius and fill stay the design system's. `!important`
 * because `cn` is clsx-only, so beating the variant's own `focus-visible:*` cannot depend on Tailwind's
 * emission order.
 */
export const FIELD_QUIET_FOCUS_CLASSES =
    'focus-visible:!ring-1 focus-visible:!ring-accent focus-visible:!ring-offset-0';
