import { toggleSelection } from './toggle-selection';

/**
 * What a list picks, always as an array: one value for a single choice (a dropdown closes on it), or several, each
 * toggled. One shape for both keeps the props a plain object, which Storybook can infer args from.
 */
export type FilterSelection = {
    multiple?: boolean;
    // Every pick after a click, in option order; a single choice is always exactly the clicked value.
    onChange: (selected: string[]) => void;
    selected: readonly string[];
};

/** Reduces a selection to the two calls the rows need. */
export function selectionHandlers(
    { multiple = false, onChange, selected }: FilterSelection,
    optionValues: readonly string[],
) {
    return {
        isSelected: (value: string) => selected.includes(value),
        pick: (value: string) => onChange(multiple ? toggleSelection(optionValues, selected, value) : [value]),
    };
}
