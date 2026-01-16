import { ApiReceiptData } from '../api/get-data';
import { useReceiptData } from '../model/use-receipt-data';
import { BaseReceiptImage } from './BaseReceiptImage';

export function ReceiptImage({ data: rawData }: { data: ApiReceiptData }) {
    const data = useReceiptData(rawData);
    return <BaseReceiptImage data={data} />;
}
