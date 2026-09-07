'use client';

import { Overlay } from '@components/common/Overlay';
import { cn } from '@components/shared/utils';
import { useClusterModal } from '@entities/cluster';
import { X } from 'react-feather';

import { ClusterSwitcherBody } from './ClusterSwitcherBody';

export function ClusterModal() {
    const [show, setShow] = useClusterModal();
    const onClose = () => setShow(false);

    return (
        <>
            <div
                className={cn(
                    'fixed bottom-0 right-0 top-0 z-[1060] flex w-[350px] max-w-full flex-col border-0 border-l border-solid border-outer-space-600 bg-dk-gray-800-dark transition-[transform,visibility] duration-150 ease-in-out',
                    show ? 'visible translate-x-0' : 'invisible translate-x-full',
                )}
            >
                {/* The panel is pinned `top-0 bottom-0`, so a short viewport or enough saved clusters runs
                    the content off the bottom edge with no way to reach it. `overflow-x-hidden` keeps it
                    to one axis: leaving x at `visible` computes it to `auto` next to a scrolling y axis,
                    adding a second scrollbar for pills that already truncate. `overscroll-contain` stops
                    the page behind the overlay from scrolling on once this reaches its end. */}
                <div
                    className="relative flex-auto overflow-y-auto overflow-x-hidden overscroll-contain p-6"
                    onClick={e => e.stopPropagation()}
                    data-testid="cluster-modal-body"
                >
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="-ml-2 -mt-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-neutral-400 transition-colors hover:text-white"
                    >
                        <X size={24} aria-hidden />
                    </button>

                    <ClusterSwitcherBody className="mt-6" />
                </div>
            </div>

            <div onClick={onClose}>
                <Overlay show={show} />
            </div>
        </>
    );
}
