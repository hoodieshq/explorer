import { EXPLORER_BASE_URL } from '@utils/env';

/**
 * Origin the share link and the OG image URL are built from.
 */
export const TX_OG_BASE_URL = EXPLORER_BASE_URL;

/**
 * Rows past this collapse into one "and N more" line, and only the programs above it get an IDL fetch -
 * resolving an IDL for a row nobody sees is pure latency.
 */
export const MAX_INSTRUCTION_ROWS = 5;
