import { EXPLORER_BASE_URL } from '@utils/env';

/**
 * Origin the share link and the OG image URL are built from.
 *
 * TEMPORARY: reads the Vercel deployment domain so a preview points its `og:image` at itself rather than
 * at production, which does not carry the route yet. Revert to plain `EXPLORER_BASE_URL` after testing.
 */
export const TX_OG_BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : EXPLORER_BASE_URL;

/**
 * Rows past this collapse into one "and N more instructions" line, and only the programs above it get an
 * IDL fetch - resolving an IDL for a row nobody sees is pure latency.
 */
export const MAX_INSTRUCTION_ROWS = 3;
