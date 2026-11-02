import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { BaseTable } from '../BaseTable';

describe('BaseTable', () => {
    it('should mark a section row so data-row variants can skip it', () => {
        render(
            <BaseTable ui="dashkit" labels="muted">
                <BaseTable.Body>
                    <BaseTable.SectionRow data-testid="section">
                        <BaseTable.Cell>Accounts</BaseTable.Cell>
                    </BaseTable.SectionRow>
                    <BaseTable.Row data-testid="row">
                        <BaseTable.Cell>Program</BaseTable.Cell>
                        <BaseTable.Cell>Value</BaseTable.Cell>
                    </BaseTable.Row>
                </BaseTable.Body>
            </BaseTable>,
        );

        expect(screen.getByTestId('section')).toHaveAttribute('data-section');
        expect(screen.getByTestId('row')).not.toHaveAttribute('data-section');
        expect(screen.getByRole('table').className).toContain(':not([data-section])');
    });

    it('should give the name column a plain percentage width with label-value columns', () => {
        render(
            <BaseTable ui="dashkit" variant="card" columns="label-value">
                <BaseTable.Body />
            </BaseTable>,
        );

        const { className } = screen.getByRole('table');
        expect(className).toContain('w-[35%]');
        expect(className).toContain('md:[&_td:first-child:not(:only-child)]:w-1/4');
        expect(className).not.toContain('calc(');
    });

    it('should mark a cell that collapses below md', () => {
        render(
            <BaseTable ui="dashkit">
                <BaseTable.Body>
                    <BaseTable.Row>
                        <BaseTable.Cell>Name</BaseTable.Cell>
                        <BaseTable.Cell collapse="max-md">Type</BaseTable.Cell>
                    </BaseTable.Row>
                </BaseTable.Body>
            </BaseTable>,
        );

        expect(screen.getByText('Type')).toHaveAttribute('data-collapse', 'max-md');
        expect(screen.getByText('Name')).not.toHaveAttribute('data-collapse');
        expect(screen.getByRole('table').className).toContain('max-md:[&_[data-collapse=max-md]]:p-0');
    });
});
