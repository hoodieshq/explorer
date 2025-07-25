import { FC, type PropsWithChildren, ReactNode } from 'react';

type ToastLayoutProps = PropsWithChildren<{
    button?: ReactNode;
}>;

export const ToastLayout: FC<ToastLayoutProps> = ({ children, button }) => (
    <div className="e-flex e-w-full e-flex-nowrap e-items-center e-gap-2">
        <span className="e-flex-1">{children}</span>
        {button}
    </div>
);
