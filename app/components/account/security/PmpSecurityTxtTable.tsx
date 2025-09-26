import { useMemo } from "react";

import { TableCardBody } from "../../common/TableCardBody";
import { CodeCell, ContactInfo, ExternalLinkCell, isString, isValidLink, RenderCode, RenderExternalLink, StringCell, tryParseContactString } from "./common";

export function PmpSecurityTxtTable({ data }: { data: Record<string, any> }) {
    const securityTxtEntries = useMemo(() => {
        if (!(data instanceof Object)) {
            throw new Error("Invalid data");
        }
        return Object.entries(data);
    }, [data]);
    return (
        <TableCardBody>
            {securityTxtEntries.map(([entryKey, value], index) => {
                return (
                    <tr key={index}>
                        <td className="w-100">{entryKey}</td>
                        <RenderEntry key={entryKey} entryKey={entryKey} value={value} />
                    </tr>
                );
            })}
        </TableCardBody>
    );
}

function RenderEntry({ entryKey, value }: { entryKey: string; value: any }) {
    if (!value) {
        return displayEmptyValue(value);
    } else if (isValidLink(value)) {
        return displayLinkValue(value);
    } else if (isString(value)) {
        return displayStringValue(value);
    } else if (Array.isArray(value)) {
        return displayArrayValue(entryKey, value);
    } else if (!isNaN(value)) {
        return displayNumericValue(value);
    } else {
        return displayFallbackValue(value);
    }
}

function displayEmptyValue(value: null | undefined | "") {
    return <StringCell value={String(value)} />;
}

function displayLinkValue(value: string) {
    return <ExternalLinkCell url={value} />;
}

function displayStringValue(value: string) {
    if (value.includes("PGP") || value.includes("PUBLIC KEY")) {
        return <CodeCell value={value} alignRight={false} />;
    }
    return <StringCell value={value} />;
}

function displayArrayValue(entryKey: string, value: any[]) {
    return (
        <td className="font-monospace">
            <RenderList entryKey={entryKey} items={value} />
        </td>
    );
}

function displayNumericValue(value: number) {
    return <StringCell value={value.toString()} />;
}

function displayFallbackValue(value: any) {
    return <CodeCell value={value} alignRight />;
}

function RenderList({ entryKey, items }: { entryKey: string; items: any[] }) {
    return (
        <ul className='e-list-none e-pl-0 text-lg-end security-txt-list [&.security-txt-list]:e-text-left'>
            {items.map((value, index) => {
                const elementKey = `${entryKey}-${index}`;
                if (!value) {
                    return <li key={elementKey}>-</li>;
                } else if (isValidLink(value)) {
                    return (
                        <li key={elementKey}>
                            <RenderExternalLink url={value} />
                        </li>
                    );
                } else if (isString(value)) {
                    const maybeContactStr = tryParseContactString(value);
                    if (Array.isArray(maybeContactStr)) {
                        return (
                            <li key={elementKey}>
                                <ContactInfo type={maybeContactStr[0]} information={maybeContactStr[1]} />
                            </li>
                        );
                    }
                    return <li key={elementKey}>{value}</li>;
                } else if (!isNaN(value)) {
                    return <li key={elementKey}>{value}</li>;
                }
                return (
                    <li key={elementKey}>
                        <RenderCode key={elementKey} value={value} />
                    </li>
                );
            })}
        </ul>
    );
}