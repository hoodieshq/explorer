import { SYSTEM_ROOT } from '@entities/instruction-intent/mocks/fixtures';
import { FetchStatus } from '@providers/cache';
import { MockTransactionsProvider } from '@storybook-config/__mocks__/MockTransactionsProvider';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AutoRefresh } from '@/app/shared/lib/use-auto-refresh';

import { DEFAULT_SIGNATURE, MOCK_PARSED_TX, MOCK_RAW_TX, MOCK_STATUS } from '../__fixtures__/transaction';
import { withTransactionProviders } from '../__fixtures__/withTransactionProviders';
import { SummaryCard } from '../SummaryCard';

vi.mock('next/navigation', () => import('@/app/__tests__/next-navigation'));

vi.mock('@entities/idl/@x/instruction-intent', async importOriginal => ({
    ...(await importOriginal<typeof import('@entities/idl/@x/instruction-intent')>()),
    useProgramIdls: () => ({ isLoading: false, programMetadataIdl: SYSTEM_ROOT }),
}));

describe('SummaryCard intents', () => {
    it('should show the intent list with the top-level instruction count', () => {
        renderSummary({ raw: MOCK_RAW_TX });

        expect(screen.getByTestId('instruction-intent-list')).toBeInTheDocument();
        expect(screen.getByTestId('instruction-intent-list-count')).toHaveTextContent('1 instruction');
    });

    it('should show loading rows while the raw transaction loads', () => {
        renderSummary({ raw: { status: FetchStatus.Fetching } });
        openList();

        expect(screen.getByTestId('instruction-intent-list-item-loading')).toBeInTheDocument();
    });

    it('should show the failure text without Retry when the raw fetch fails', () => {
        renderSummary({ raw: { status: FetchStatus.FetchFailed } });
        openList();

        expect(screen.getByTestId('instruction-intent-list-item-failed')).toBeInTheDocument();
        expect(screen.queryByTestId('instruction-intent-list-item-retry')).not.toBeInTheDocument();
    });

    it('should not show the list before the parsed transaction loads', () => {
        renderSummary({ hasParsed: false, raw: MOCK_RAW_TX });

        expect(screen.queryByTestId('instruction-intent-list')).not.toBeInTheDocument();
    });
});

function renderSummary({
    hasParsed = true,
    ...props
}: {
    raw: typeof MOCK_RAW_TX | { status: FetchStatus };
    hasParsed?: boolean;
}) {
    return render(
        <MockTransactionsProvider
            parsed={hasParsed ? { [DEFAULT_SIGNATURE]: MOCK_PARSED_TX } : undefined}
            raw={{ [DEFAULT_SIGNATURE]: props.raw as typeof MOCK_RAW_TX }}
            status={{ [DEFAULT_SIGNATURE]: MOCK_STATUS }}
        >
            <SummaryCard signature={DEFAULT_SIGNATURE} autoRefresh={AutoRefresh.Inactive} />
        </MockTransactionsProvider>,
        { wrapper: withTransactionProviders({}, {}) },
    );
}

function openList() {
    fireEvent.click(screen.getByTestId('instruction-intent-list-toggle'));
}
