'use client';

import { useDebounceCallback } from '@react-hook/debounce';
import { useState } from 'react';
import { Eye } from 'react-feather';

import { DownloadableButton } from '@/app/components/common/Downloadable';
import { WalletProvider } from '@/app/providers/wallet-provider';

import { IdlRenderer } from './IdlRenderer';

export function IdlSection({ idl, badge, programId }: { idl: any; badge: React.ReactNode; programId: string }) {
    const [collapsedValue, setCollapsedValue] = useState<boolean | number>(1);
    const [isRawIdlView, setIsRawIdlView] = useState<boolean>(false);
    const [searchStr, setSearchStr] = useState<string>('');

    const onSearchIdl = useDebounceCallback((str: string) => {
        setSearchStr(str);
    }, 1000);

    return (
        <>
            <div className="d-flex justify-content-between align-items-center">
                {badge}
                <div className="d-flex align-items-center gap-4">
                    {isRawIdlView ? (
                        <div className="form-check form-switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="expandToggle"
                                onChange={e => setCollapsedValue(e.target.checked ? false : 1)}
                            />
                            <label className="form-check-label" htmlFor="expandToggle">
                                Expand All
                            </label>
                        </div>
                    ) : (
                        <input
                            className="form-control"
                            style={{ height: 30 }}
                            placeholder="Search"
                            onChange={e => onSearchIdl(e.target.value)}
                        />
                    )}
                    <div className="col-auto d-flex align-items-center gap-2">
                        <div className="d-flex btn btn-sm btn-primary">
                            <DownloadableButton
                                data={Buffer.from(JSON.stringify(idl, null, 2)).toString('base64')}
                                filename={`${programId}-idl.json`}
                                type="application/json"
                            >
                                Download
                            </DownloadableButton>
                        </div>
                        <button
                            className="d-flex btn btn-sm btn-primary align-items-center"
                            onClick={() => setIsRawIdlView(!isRawIdlView)}
                        >
                            <Eye className="me-2" size={15} />
                            {isRawIdlView ? 'Details' : 'Raw'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4 e-min-h-[200px]">
                <WalletProvider>
                    <IdlRenderer
                        idl={idl}
                        collapsed={collapsedValue}
                        raw={isRawIdlView}
                        searchStr={searchStr}
                        programId={programId}
                    />
                </WalletProvider>
            </div>
        </>
    );
}
