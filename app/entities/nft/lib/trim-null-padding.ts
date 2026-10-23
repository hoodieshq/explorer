// Token Metadata pads `name`, `symbol` and `uri` with trailing NUL bytes to fixed widths, and the umi deserializer
// keeps them. An empty symbol then arrives as ten NULs, not as ''.
export function trimNullPadding(value: string): string {
    let end = value.length;
    while (end > 0 && value[end - 1] === '\0') end--;
    return value.slice(0, end);
}
