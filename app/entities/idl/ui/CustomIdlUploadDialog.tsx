import { Button } from '@components/shared/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@components/shared/ui/dialog';

import { cn } from '@/app/components/shared/utils';

import { type CustomIdlWriteResult } from '../model/custom-idl/custom-idl-store';
import { CustomIdlForm, CustomIdlIntro, type CustomIdlUploadRequest } from './CustomIdlForm';

export type { CustomIdlUploadRequest };

/** Explains what a custom IDL does and takes one as a file or pasted JSON, for the program that opened it. */
export function CustomIdlUploadDialog({
    programAddress,
    open,
    onOpenChange,
    onSubmit,
}: {
    programAddress?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (request: CustomIdlUploadRequest) => CustomIdlWriteResult;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* The content unmounts on close, so the form starts empty on every open. */}
            <DialogContent className={CONTENT}>
                <DialogHeader className="!space-y-0 !text-left">
                    <DialogTitle className="!text-xl !font-medium !leading-snug !text-white">
                        Add a custom IDL
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-5 text-left">
                    <DialogDescription className="mx-0 mb-2 mt-0 !text-[13px] leading-relaxed !text-white">
                        <CustomIdlIntro />
                    </DialogDescription>
                    <CustomIdlForm
                        programAddress={programAddress}
                        submitLabel="Add IDL"
                        onSubmit={onSubmit}
                        onSubmitted={() => onOpenChange(false)}
                        secondaryActions={
                            <DialogClose asChild>
                                <Button size="lg" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                        }
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// The Interactive IDL mainnet confirmation's box (itself the navigation's RPC consent dialog): the cluster
// menu's ground and edge, roomier padding, one scroll for the whole box, and the close mark inset as there.
// `!`: the shared DialogContent sets its own box, and this dialog does not change the shared component.
const CONTENT = cn(
    '!max-w-md !gap-3 !border-outer-space-800 !bg-outer-space-900 !p-5 !pt-6 max-h-[calc(100dvh-2rem)] overflow-y-auto',
    '[&>button:last-child]:!right-3.5 [&>button:last-child]:!top-3.5',
    '[&>button:last-child]:!h-6 [&>button:last-child]:!w-6',
    '[&>button:last-child>svg]:!h-[18px] [&>button:last-child>svg]:!w-[18px]',
);
