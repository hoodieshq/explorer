import { ComponentType, ReactNode } from 'react';
import { Download, IconProps } from 'react-feather';

import { triggerDownload } from '@/app/shared/lib/triggerDownload';

export function DownloadableIcon({
    data,
    filename,
    children,
}: {
    data: string;
    filename: string;
    children: ReactNode;
}) {
    return (
        <>
            <Download className="c-pointer me-2" onClick={() => triggerDownload(data, filename)} size={15} />
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
    return (
        <div
            onClick={() => triggerDownload(data, filename, type)}
            style={{ alignItems: 'center', cursor: 'pointer', display: 'inline-flex' }}
        >
            <Icon className="me-2" size={15} />
            {children}
        </div>
    );
}
