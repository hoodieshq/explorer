import { readFileSync } from 'node:fs';

import type { AnchorIdl } from '../../types';

// Real mainnet snapshots. NOTE: both legs carry the SAME Anchor-format document — PMP is a storage
// mechanism, not a format; this program never uploaded a Codama root (SPL Token's PMP leg is the
// codama sample, see ./tokenkeg.ts).
const load = (relativePath: string): AnchorIdl =>
    JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')) as AnchorIdl;

/** let_me_buy's IDL from its Anchor PDA. */
export const loadLetMeBuyIdl = (): AnchorIdl => load('./let-me-buy.anchor.idl.json');

/** let_me_buy's IDL from its PMP `idl` account — Anchor-format there too. */
export const loadLetMeBuyPmpIdl = (): AnchorIdl => load('./let-me-buy.pmp.idl.json');
