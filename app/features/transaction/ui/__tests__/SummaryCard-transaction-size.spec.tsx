import { render, screen } from '@testing-library/react';
import React from 'react';

import { AutoRefresh } from '@/app/shared/lib/use-auto-refresh';

import {
    DEFAULT_SIGNATURE,
    MOCK_PARSED_TX,
    MOCK_RAW_TX,
    MOCK_RAW_V1_TX,
    MOCK_STATUS,
    MOCK_V1_TX,
} from '../__fixtures__/transaction';
import { withTransactionProviders } from '../__fixtures__/withTransactionProviders';
import { SummaryCard } from '../SummaryCard';

vi.mock('next/navigation', () => ({
    usePathname: () => `/tx/${DEFAULT_SIGNATURE}`,
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

function renderSummary({ parsed, raw }: { parsed: typeof MOCK_PARSED_TX; raw: typeof MOCK_RAW_TX }) {
    const Wrapper = withTransactionProviders(
        { [DEFAULT_SIGNATURE]: parsed },
        { [DEFAULT_SIGNATURE]: MOCK_STATUS },
        { [DEFAULT_SIGNATURE]: raw },
    );

    return render(
        <Wrapper>
            <SummaryCard signature={DEFAULT_SIGNATURE} autoRefresh={AutoRefresh.Inactive} />
        </Wrapper>,
    );
}

describe('SummaryCard transaction size limit', () => {
    it('should cap a single-signer legacy transaction at the packet size', async () => {
        renderSummary({ parsed: MOCK_PARSED_TX, raw: MOCK_RAW_TX });

        expect(await screen.findByText('Max is 1,232 bytes')).toBeInTheDocument();
    });

    it('should cap a v1 transaction at the v1 size limit', async () => {
        renderSummary({ parsed: MOCK_V1_TX, raw: MOCK_RAW_V1_TX });

        expect(await screen.findByText('Max is 4,096 bytes')).toBeInTheDocument();
    });
});
