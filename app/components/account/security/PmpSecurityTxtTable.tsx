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
        return <StringCell value="-" />;
    } else if (isValidLink(value)) {
        return <ExternalLinkCell url={value} />;
    } else if (isString(value)) {
        if (value.includes("PGP") || value.includes("PUBLIC KEY")) {
            return <CodeCell value={value} alignRight={false} />;
        }
        return <StringCell value={value} />;
    } else if (Array.isArray(value)) {
        return (
            <td className="text-lg-end font-monospace">
                <RenderList entryKey={entryKey} items={value} />
            </td>
        );
    } else if (!isNaN(value)) {
        return <StringCell value={value.toString()} />;
    } else {
        return <CodeCell value={value} alignRight />;
    }
}

function RenderList({ entryKey, items }: { entryKey: string; items: any[] }) {
    return (
        <ul className='e-list-none e-pl-0'>
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