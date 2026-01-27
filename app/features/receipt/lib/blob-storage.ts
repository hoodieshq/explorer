import { isEnvEnabled } from '@utils/env';
import Logger from '@utils/logger';
import { head, put } from '@vercel/blob';

export function isBlobStorageEnabled(): boolean {
    return isEnvEnabled(process.env.NEXT_PUBLIC_RECEIPT_BLOB_ENABLED) && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Store receipt image in Vercel Blob
 *
 * @param signature Transaction signature
 * @param imageBuffer Image buffer (PNG)
 * @returns Blob URL or null if failed
 */
export async function storeReceiptImage(signature: string, imageBuffer: ArrayBuffer): Promise<string | null> {
    if (!isBlobStorageEnabled()) {
        return null;
    }

    try {
        const blob = await put(`receipts/${signature}.png`, imageBuffer, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'image/png',
        });

        return blob.url;
    } catch (error) {
        Logger.error(error);
        return null;
    }
}

/**
 * Check if receipt image exists in Vercel Blob
 *
 * @param signature Transaction signature
 * @returns Blob URL if exists, null otherwise
 */
export async function getReceiptImageUrl(signature: string): Promise<string | null> {
    if (!isBlobStorageEnabled()) {
        return null;
    }

    try {
        const headResponse = await head(`receipts/${signature}.png`);

        if (headResponse) {
            return headResponse.url;
        }

        return null;
    } catch (error) {
        Logger.error(error);
        return null;
    }
}

/**
 * Fetch receipt image from Vercel Blob
 *
 * @param url Blob URL
 * @returns Image buffer or null if failed
 */
export async function fetchReceiptImage(url: string): Promise<ArrayBuffer | null> {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            return null;
        }

        return await response.arrayBuffer();
    } catch (error) {
        Logger.error(error);
        return null;
    }
}
