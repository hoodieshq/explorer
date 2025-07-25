import * as React from 'react';
import { ChevronDown, ChevronUp, Circle } from 'react-feather';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/shared/ui/card';

interface InstructionCardProps {
    title: string;
    description?: string;
    isSelected?: boolean;
    onSelect?: () => void;
    children?: React.ReactNode;
    className?: string;
}

export function InstructionCard({
    title,
    description,
    isSelected = false,
    onSelect,
    children,
    className,
}: InstructionCardProps) {
    const [expanded, setExpanded] = React.useState(false);

    const handleRadioClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect?.();
    };

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    return (
        <Card className={className}>
            <CardHeader className="e-p-4 e-pb-2">
                <div className="e-flex e-items-start e-justify-between e-gap-3">
                    <div className="e-flex e-items-start e-gap-3 e-flex-1">
                        {/* Radio Selection */}
                        <button
                            type="button"
                            onClick={handleRadioClick}
                            className="e-flex e-items-center e-justify-center e-w-5 e-h-5 e-rounded-full e-border-2 e-border-[#8E9090] e-bg-transparent e-transition-colors e-duration-200 hover:e-border-white focus:e-outline-none focus:e-ring-2 focus:e-ring-white focus:e-ring-opacity-50"
                        >
                            {isSelected && (
                                <Circle
                                    size={12}
                                    className="e-fill-white e-text-white"
                                />
                            )}
                        </button>

                        {/* Title and Description */}
                        <div className="e-flex-1 e-min-w-0">
                            <CardTitle className="e-text-base e-font-medium e-text-white e-mb-1">
                                {title}
                            </CardTitle>
                            {description && (
                                <p className="e-text-sm e-text-[#8E9090] e-leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    {children && (
                        <button
                            type="button"
                            onClick={handleExpandClick}
                            className="e-flex e-items-center e-justify-center e-w-8 e-h-8 e-rounded-md e-bg-[#1A1A1A] e-border e-border-[#2A2A2A] hover:e-bg-[#2A2A2A] hover:e-border-[#3A3A3A] e-transition-all e-duration-200 focus:e-outline-none focus:e-ring-2 focus:e-ring-white focus:e-ring-opacity-50"
                            aria-expanded={expanded}
                            aria-label={expanded ? 'Collapse' : 'Expand'}
                        >
                            {expanded ? (
                                <ChevronUp size={16} className="e-text-[#8E9090]" />
                            ) : (
                                <ChevronDown size={16} className="e-text-[#8E9090]" />
                            )}
                        </button>
                    )}
                </div>
            </CardHeader>

            {/* Expandable Content */}
            {expanded && children && (
                <CardContent className="e-p-4 e-pt-0">
                    <div className="e-border-t e-border-[#2A2A2A] e-pt-4">
                        {children}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
