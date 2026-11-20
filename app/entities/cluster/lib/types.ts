import { EpochSchedule } from '@explorer/utils';

export interface EpochInfo {
    absoluteSlot: bigint;
    blockHeight: bigint;
    epoch: bigint;
    slotIndex: bigint;
    slotsInEpoch: bigint;
}

export interface ClusterInfo {
    epochSchedule: EpochSchedule;
    epochInfo: EpochInfo;
}
