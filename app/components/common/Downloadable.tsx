import bs58 from 'bs58';
import { ComponentType, createRef, ReactNode, useCallback, useEffect, useState } from 'react';
import { Download, IconProps } from 'react-feather';
import useAsyncEffect from 'use-async-effect';

import { Button } from '../shared/ui/button';

export function DownloadableIcon({
    data,
    filename,
    children,
}: {
    data: string;
    filename: string;
    children: ReactNode;
}) {
    const handleClick = async () => {
        const blob = new Blob([Buffer.from(data, 'base64')]);
        const fileDownloadUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = fileDownloadUrl;
        tempLink.setAttribute('download', filename);
        tempLink.click();
    };

    return (
        <>
            <Download className="c-pointer me-2" onClick={handleClick} size={15} />
            {children}
        </>
    );
}

export function DownloadableButton({
    data,
    filename,
    children,
    type,
    icon: Icon = Download as ComponentType<IconProps>,
}: {
    data: string;
    filename: string;
    children?: ReactNode;
    type?: string;
    icon?: ComponentType<IconProps>;
}) {
    const handleDownload = async () => {
        const blob = new Blob([Buffer.from(data, 'base64')], type ? { type } : {});
        const fileDownloadUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = fileDownloadUrl;
        tempLink.setAttribute('download', filename);
        tempLink.click();
    };

    return (
        <div onClick={handleDownload} style={{ alignItems: 'center', cursor: 'pointer', display: 'inline-flex' }}>
            <Icon className="me-2" size={15} />
            {children}
        </div>
    );
}

export function DownloadableDropdown({
    data,
    encodings = ['hex', 'base58', 'base64'],
    filename,
}: {
    filename: string;
    data: Buffer | Uint8Array | null;
    encodings?: string[];
}) {
    const dropdownRef = createRef<HTMLButtonElement>();

    useAsyncEffect(
        async isMounted => {
            if (!dropdownRef.current) {
                return;
            }
            const Dropdown = (await import('bootstrap/js/dist/dropdown')).default;
            if (!isMounted || !dropdownRef.current) {
                return;
            }
            return new Dropdown(dropdownRef.current, {
                popperConfig() {
                    return {
                        strategy: 'fixed',
                    };
                },
            });
        },
        dropdown => {
            if (dropdown) {
                dropdown.dispose();
            }
        },
        [dropdownRef]
    );

    return (
        <div className="dropdown e-overflow-visible">
            <Button variant="outline" size="sm" ref={dropdownRef} data-bs-toggle="dropdown" type="button">
                <Download size={12} />
                Download
            </Button>
            <div className="dropdown-menu-end dropdown-menu e-z-10">
                <div className="d-flex e-flex-col">
                    {encodings.map((encoding: string) => (
                        <DownloadableDropdownButton
                            key={encoding}
                            data={data}
                            encoding={encoding}
                            filename={filename}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function DownloadableDropdownButton({
    data,
    encoding,
    filename,
}: {
    data: Buffer | Uint8Array | null;
    encoding: string;
    filename: string;
}) {
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleDownload = (encoding: string) => {
        if (!data) {
            setIsLoading(true);
            return;
        }
        proceedDownload(encoding);
    };

    const proceedDownload = useCallback(
        (encoding: string) => {
            const localData = data as Buffer | Uint8Array;
            let buffer;
            if (encoding === 'base58') {
                buffer = bs58.encode(localData);
            } else {
                buffer = new Blob([Buffer.from(localData.toString(encoding as BufferEncoding))], {});
            }
            const blob = new Blob([buffer], {});
            const fileDownloadUrl = URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = fileDownloadUrl;
            tempLink.setAttribute('download', `${filename}_${encoding}.txt`);
            tempLink.click();
        },
        [data, filename]
    );

    useEffect(() => {
        if (data && isLoading) {
            proceedDownload(encoding);
            setIsLoading(false);
        }
    }, [isLoading, data, encoding, proceedDownload]);

    return <Button onClick={() => handleDownload(encoding)}>Download {encoding}</Button>;
}
