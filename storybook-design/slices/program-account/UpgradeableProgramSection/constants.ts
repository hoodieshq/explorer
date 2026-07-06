// Label column for the Program Account card: 25% of the card width, clamped to [100px, 240px].
// Shared across every row (the section rows and the Raw-view rows) so their values line up in
// one column. `sm:` — applied only once the row flips to the horizontal label/value layout.
export const LABEL_WIDTH = 'sm:w-[clamp(100px,25%,240px)]';
