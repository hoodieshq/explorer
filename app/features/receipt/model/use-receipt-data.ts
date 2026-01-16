import { ApiReceiptData } from '../api/get-data';

export type ReceiptData = ApiReceiptData;

export function useReceiptData(rawData: ApiReceiptData): ReceiptData {
    return rawData;
}
