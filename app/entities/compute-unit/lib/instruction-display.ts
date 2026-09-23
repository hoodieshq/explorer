import type { InstructionCUData } from './types';

/**
 * One chart row, with every string it renders already derived. `name` is dropped so a consumer reads
 * `label` or `legendLabel` and cannot bypass the positional fallback those apply.
 */
export type InstructionCUDisplay = Omit<InstructionCUData, 'name'> & {
    // The CU figure the bar is sized by. Falls back `computeUnits` -> `defaultUnits` -> `scheduledUnits`,
    // then to 0 when none applies - a v1 row with no measurement and no default has no figure at all.
    displayCU: number;
    // Chart tooltip title, before the program qualifier.
    label: string;
    // Legend entry: the instruction's position, then its name — `Unknown Instruction` when nothing
    // resolved one, so every row in the list reads the same shape.
    legendLabel: string;
    // The CU figure as shown, with a ~ prefix when it is the schedule's estimate, or a dash when 0.
    displayValue: string;
    // True only when `scheduledUnits` is present and neither `computeUnits` nor `defaultUnits` supplies a
    // figure - the schedule's reserve is the one number that is ever a guess.
    isEstimate: boolean;
};

/**
 * The per-instruction labels and CU figures the chart displays, derived from the CU data alone. Pure,
 * so the labelling is testable without rendering a chart.
 */
export function toInstructionCUDisplay(instructions: InstructionCUData[]): InstructionCUDisplay[] {
    return instructions.map((item, i) => {
        // v1 schedules no reserve, so the chain can end with nothing: the logs said nothing about this
        // instruction and there is no per-instruction budget to fall back on.
        const value = item.computeUnits || item.defaultUnits || item.scheduledUnits || 0;
        const isEstimate = !item.computeUnits && !item.defaultUnits && item.scheduledUnits !== undefined;
        // A row with no figure reads as a dash. A bare 0 would look like a measurement of zero.
        const displayValue = value === 0 ? '-' : `${isEstimate ? '~' : ''}${value.toLocaleString()}`;

        return {
            ...item,
            displayCU: value,
            displayValue,
            isEstimate,
            // The tooltip shows one row at a time, so an unnamed instruction is identified by its
            // position alone — `Unknown Instruction` there would read the same on every unnamed row.
            label: item.name ?? positionLabel(i),
            // The legend shows every row at once, so all of them carry the position prefix. An unnamed
            // row names itself instead of dropping out of the shape the rows around it follow.
            legendLabel: `#${i + 1} ${item.name ?? UNKNOWN_INSTRUCTION_LABEL}`,
        };
    });
}

/**
 * The chart tooltip's title: the instruction name qualified by its program, when the program is known.
 * The legend omits the program qualifier and prefixes the position instead, to fit the card width.
 */
export function formatTooltipTitle({ label, programName }: { label: string; programName?: string }): string {
    return programName ? `${programName}: ${label}` : label;
}

// Kept in step with the sentinel `getInstructionSummaries` substitutes for history rows, so one
// instruction reads the same wherever it appears. Declared here rather than imported: this entity owns
// its own fallback by design — see "Two row shapes" in the transaction-data README.
const UNKNOWN_INSTRUCTION_LABEL = 'Unknown Instruction';

function positionLabel(index: number): string {
    return `Instruction #${index + 1}`;
}
