import { render, screen } from '@testing-library/react';
import React from 'react';

import { AutoRefresh } from '@/app/shared/lib/use-auto-refresh';

import { byLabelText } from '../__fixtures__/byLabelText';
import {
    DEFAULT_SIGNATURE,
    MOCK_RAW_V1_NO_CONFIG_TX,
    MOCK_RAW_V1_TX,
    MOCK_STATUS,
    MOCK_V1_NO_CONFIG_TX,
    MOCK_V1_TX,
} from '../__fixtures__/transaction';
import { withTransactionProviders } from '../__fixtures__/withTransactionProviders';
import { SummaryCard } from '../SummaryCard';

vi.mock('next/navigation', () => ({
    usePathname: () => `/tx/${DEFAULT_SIGNATURE}`,
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

function rowValue(label: string): string | null | undefined {
    return screen.getByText(label).nextElementSibling?.textContent;
}

function renderSummary({
    parsed = MOCK_V1_NO_CONFIG_TX,
    raw = MOCK_RAW_V1_NO_CONFIG_TX,
}: { parsed?: typeof MOCK_V1_NO_CONFIG_TX; raw?: typeof MOCK_RAW_V1_NO_CONFIG_TX } = {}) {
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

describe('SummaryCard v1 undeclared resource limits', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should render the CUs Consumed / Limit row as 0 / 0 for an undeclared compute unit limit', async () => {
        renderSummary();

        expect(await screen.findByText('CUs Consumed / Limit')).toBeInTheDocument();
        expect(rowValue('CUs Consumed / Limit')).toBe('0 / 0');
        expect(screen.queryByText('CUs Consumed')).not.toBeInTheDocument();
    });

    it('should render the loaded accounts data size limit default when the message declares none', async () => {
        renderSummary();

        expect(await screen.findByText('Loaded accounts data size limit')).toBeInTheDocument();
        expect(rowValue('Loaded accounts data size limit')).toBe('0');
    });

    it('should render the heap size default when the message declares none', async () => {
        renderSummary();

        expect(await screen.findByText('Heap size')).toBeInTheDocument();
        expect(rowValue('Heap size')).toBe('32,768');
    });

    it('should render a zero priority fee when the v1 message declares no fee', async () => {
        renderSummary();

        expect(await screen.findByText(byLabelText('Priority fee (total)'))).toBeInTheDocument();
        expect(screen.getByText('◎0')).toBeInTheDocument();
    });

    it('should render the SIMD-0553 projection row for an undeclared compute unit limit', async () => {
        vi.stubEnv('NEXT_PUBLIC_SIMD_0553_FEE_ENABLED', 'true');

        renderSummary();

        expect(await screen.findByText(byLabelText('Fee under SIMD-0553'))).toBeInTheDocument();
    });
});

describe('SummaryCard v1 declared resource limits', () => {
    it('should render the declared compute unit limit in the CUs Consumed / Limit row', async () => {
        renderSummary({ parsed: MOCK_V1_TX, raw: MOCK_RAW_V1_TX });

        expect(await screen.findByText('CUs Consumed / Limit')).toBeInTheDocument();
        expect(rowValue('CUs Consumed / Limit')).toBe('150 / 8,442');
    });

    it('should render the declared loaded accounts data size limit', async () => {
        renderSummary({ parsed: MOCK_V1_TX, raw: MOCK_RAW_V1_TX });

        expect(await screen.findByText('Loaded accounts data size limit')).toBeInTheDocument();
        expect(rowValue('Loaded accounts data size limit')).toBe('75,013');
    });

    it('should render the declared heap size', async () => {
        renderSummary({ parsed: MOCK_V1_TX, raw: MOCK_RAW_V1_TX });

        expect(await screen.findByText('Heap size')).toBeInTheDocument();
        expect(rowValue('Heap size')).toBe('262,144');
    });

    it('should render the declared priority fee', async () => {
        renderSummary({ parsed: MOCK_V1_TX, raw: MOCK_RAW_V1_TX });

        expect(await screen.findByText(byLabelText('Priority fee (total)'))).toBeInTheDocument();
        expect(screen.getByText('◎0.00001')).toBeInTheDocument();
    });
});
