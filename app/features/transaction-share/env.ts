import { EXPLORER_BASE_URL } from '@utils/env';

// Keep in env for a while as this one used to be env variable.
export const isClusterProbeEnabled = false;

// temp change for testing sharing
export const TX_OG_BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : EXPLORER_BASE_URL;

