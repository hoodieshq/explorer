import { AccountStatus } from './types';

export function formatBytes(bytes: number): string {
    const abs = Math.abs(bytes);
    if (abs === 0) return '0 B';
    if (abs < 1024) return `${bytes} B`;
    if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(blockTime: number | undefined): string {
    if (!blockTime) return 'Unknown';
    const now = Date.now() / 1000;
    const diff = now - blockTime;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
    return `${(diff / (86400 * 365)).toFixed(1)}y ago`;
}

export function tryPrettyJson(text: string): string {
    try {
        return JSON.stringify(JSON.parse(text), undefined, 2);
    } catch {
        return text;
    }
}

export function getStatusLabel(status: AccountStatus): string {
    switch (status) {
        case AccountStatus.Active:
            return 'Active';
        case AccountStatus.Pending:
            return 'Pending';
        case AccountStatus.Closed:
            return 'Closed';
        case AccountStatus.NonExistent:
            return 'Non-existent';
    }
}
