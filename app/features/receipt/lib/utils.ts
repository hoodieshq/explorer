import { displayTimestampUtc } from '@utils/date';
export { lamportsToSolString } from '@utils/index';

export function formatDate(blockTime: number): string {
    return displayTimestampUtc(blockTime * 1000, true);
}
