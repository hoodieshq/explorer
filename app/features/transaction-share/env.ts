import { isEnvEnabled } from '@utils/env';

export const isClusterProbeEnabled = isEnvEnabled(process.env.TX_CLUSTER_PROBE_ENABLED);
