import type { DataSource } from '@solana-program/program-metadata';

import { pmpAnalytics, type PmpPayloadSource, type PmpTab } from './analytics';
import { PMP_ANALYTICS_IX_NAMES, PMP_DATA_SOURCE_ANALYTICS_NAMES, PMP_FORMAT_ANALYTICS_NAMES } from './constants';
import type { PmpPayloadInstruction } from './types';

/**
 * Builds the reader-initiated tab-change handler for the Decoded Content section's tabs, translating the
 * section's own vocabulary (pmpIx, dataSource, source) into the label set `pmpAnalytics.trackTabOpened` expects.
 * Bound once per panel, next to the `source` it labels, so the inline-payload panel and the read-account panel
 * cannot drift on how they label what is otherwise the same event.
 */
export function createPayloadTabTracker({
    dataSource,
    pmpIx,
    source,
}: {
    dataSource: DataSource;
    pmpIx: PmpPayloadInstruction;
    source: PmpPayloadSource;
}): (tab: PmpTab) => void {
    return (tab: PmpTab) => {
        pmpAnalytics.trackTabOpened({
            dataSource: PMP_DATA_SOURCE_ANALYTICS_NAMES[dataSource],
            format: PMP_FORMAT_ANALYTICS_NAMES[pmpIx.config.format],
            instruction: PMP_ANALYTICS_IX_NAMES[pmpIx.kind],
            source,
            tab,
        });
    };
}
