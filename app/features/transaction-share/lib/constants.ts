import { EXPLORER_BASE_URL } from '@utils/env';

/**
 * Origin the share link and the OG image URL are built from.
 */
export const TX_OG_BASE_URL = EXPLORER_BASE_URL;

/**
 * Rows past this collapse into one "and N more instructions" line, and only the programs above it get an
 * IDL fetch - resolving an IDL for a row nobody sees is pure latency.
 *
 * Three, because a design row is 64px tall (14 padding, 36 line, 14 padding) and the card's content box is
 * 486px. Four rows plus the overflow line leave 8px of slack, which is not enough to absorb a taller face.
 */
export const MAX_INSTRUCTION_ROWS = 3;
