import { EXPLORER_BASE_URL } from '@utils/env';

// Empty string is valid (relative URLs), only undefined falls back to EXPLORER_BASE_URL
export const TX_OG_BASE_URL =
    process.env.TX_OG_BASE_URL !== undefined ? process.env.TX_OG_BASE_URL.trim() : EXPLORER_BASE_URL;
