import copy from 'copy-to-clipboard';
import { useMemo } from 'react';
import { ExternalToast, toast } from 'sonner';

import { ExplorerLink } from '@/app/entities/cluster/ui/ExplorerLink';

import { CustomToast, type CustomToastProps } from './custom';
import { ToastLayout } from './toast-layout';

export const useToast = () =>
    useMemo(
        () =>
            ({
                address: (message: string, address: string) => {
                    toast.info(
                        <ToastLayout
                            button={
                                <button
                                    className="e-shrink-0 e-cursor-pointer e-text-xs"
                                    aria-label="Copy Address"
                                    onClick={() => {
                                        copy(address);
                                        toast.success('Copied to clipboard');
                                    }}
                                >
                                    Copy Address
                                </button>
                            }
                        >
                            {message}
                        </ToastLayout>,
                        {
                            classNames: {
                                content: 'e-flex-1',
                            },
                        }
                    );
                },
                brand: (props: Omit<CustomToastProps, 'id'>, data?: ExternalToast) =>
                    toast.custom(id => <CustomToast id={id} {...props} />, data),
                custom: toast.custom,
                error: toast.error,
                info: toast.info,
                loading: toast.loading,
                message: toast.message,
                promise: toast.promise,
                success: toast.success,
                transaction: (signature: string) => {
                    toast.info(
                        <ToastLayout
                            button={
                                <ExplorerLink
                                    path={`/tx/${signature}`}
                                    className="e-shrink-0 e-text-xs"
                                    label="View Transaction"
                                />
                            }
                        >
                            Transaction sent
                        </ToastLayout>,
                        {
                            classNames: {
                                content: 'e-flex-1',
                            },
                        }
                    );
                },
                warning: toast.warning,
            } as const),
        []
    );
