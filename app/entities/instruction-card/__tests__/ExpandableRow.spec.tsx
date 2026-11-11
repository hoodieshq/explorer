import { BaseTable } from '@shared/ui/Table';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ExpandableRow, FieldNameCell } from '../ui/ExpandableRow';

describe('ExpandableRow', () => {
    it('should mount the children only while the row is expanded', () => {
        renderInTable(
            <ExpandableRow fieldName="config" fieldType="struct" nestingLevel={0}>
                <BaseTable.Row>
                    <BaseTable.Cell>child</BaseTable.Cell>
                </BaseTable.Row>
            </ExpandableRow>,
        );
        expect(screen.queryByText('child')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Expand'));
        expect(screen.getByText('child')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Collapse'));
        expect(screen.queryByText('child')).not.toBeInTheDocument();
    });
});

describe('FieldNameCell', () => {
    it('should draw the nesting arrow for a nested field only', () => {
        renderInTable(
            <>
                <BaseTable.Row data-testid="top">
                    <FieldNameCell name="top" type="u8" nestingLevel={0} />
                </BaseTable.Row>
                <BaseTable.Row data-testid="nested">
                    <FieldNameCell name="nested" type="u8" nestingLevel={1} />
                </BaseTable.Row>
            </>,
        );

        const top = screen.getByTestId('top');
        const nested = screen.getByTestId('nested');
        // eslint-disable-next-line testing-library/no-node-access -- the arrow is an svg with no role
        expect(top.querySelector('svg')).toBeNull();
        // eslint-disable-next-line testing-library/no-node-access -- the arrow is an svg with no role
        expect(nested.querySelector('svg')).not.toBeNull();
    });

    it('should draw one arrow at the deepest level and a blank for each level above it', () => {
        renderInTable(
            <>
                <BaseTable.Row data-testid="first">
                    <FieldNameCell name="first" type="u8" nestingLevel={1} />
                </BaseTable.Row>
                <BaseTable.Row data-testid="third">
                    <FieldNameCell name="third" type="u8" nestingLevel={3} />
                </BaseTable.Row>
            </>,
        );

        const first = screen.getByTestId('first');
        const third = screen.getByTestId('third');
        // eslint-disable-next-line testing-library/no-node-access -- the arrow and the blanks have no role
        expect(first.querySelectorAll('[data-nesting-indent]')).toHaveLength(0);
        // eslint-disable-next-line testing-library/no-node-access -- the arrow and the blanks have no role
        expect(third.querySelectorAll('[data-nesting-indent]')).toHaveLength(2);
        // eslint-disable-next-line testing-library/no-node-access -- the arrow and the blanks have no role
        expect(third.querySelectorAll('svg')).toHaveLength(1);
    });
});

function renderInTable(rows: React.ReactNode) {
    return render(
        <BaseTable>
            <BaseTable.Body>{rows}</BaseTable.Body>
        </BaseTable>,
    );
}
