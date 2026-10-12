/**
 * The picked values after toggling `value`, kept in option order so a URL built from them doesn't depend on the
 * order of the clicks.
 */
export function toggleSelection(optionValues: readonly string[], selected: readonly string[], value: string): string[] {
    const isSelected = selected.includes(value);
    return optionValues.filter(option => (option === value ? !isSelected : selected.includes(option)));
}
