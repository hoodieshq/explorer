import { ChevronDown } from 'react-feather';

// import type { InstructionData } from '../../../formatted-idl/formatters/FormattedIdl';
import type { InstructionData } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';
import { Badge } from '@/app/components/shared/ui/badge';

export function InstructionHeader({ instruction }: { instruction: InstructionData }) {
    return (
        <div className="e-flex e-w-full e-items-center e-justify-between">
            <div className="e-flex e-items-center e-gap-3">
                <span className="e-font-semibold e-text-white">{instruction.name}</span>
                <div className="e-flex e-gap-2">
                    <Badge variant="transparent" size="sm" className="e-text-[#8E9090]">
                        {instruction.accounts.length} accounts
                    </Badge>
                    <Badge variant="transparent" size="sm" className="e-text-[#8E9090]">
                        {instruction.args.length} args
                    </Badge>
                </div>
            </div>
            <ChevronDown size={16} className="e-text-[#8E9090]" />
        </div>
    );
}
