import type { EpochSchedule } from '@explorer/utils';

import { getRpc } from './get-rpc';

export async function fetchEpochSchedule(url: string): Promise<EpochSchedule> {
    return getRpc(url).getEpochSchedule().send();
}
