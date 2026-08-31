import { EXPLORER_BASE_URL } from '@utils/env';

/**
 * Origin the share link and the OG image URL are built from.
 * Temporarily point to VERCEL_PROJECT_PRODUCTION_URL so we can test sharing.
 */
export const TX_OG_BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : EXPLORER_BASE_URL;

/**
 * Rows past this collapse into one "and N more" line, and only the programs above it get an IDL fetch -
 * resolving an IDL for a row nobody sees is pure latency.
 */
export const MAX_INSTRUCTION_ROWS = 5;
