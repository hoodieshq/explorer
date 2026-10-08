import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { MessageCircle } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';

export type BaseFeedbackWidgetProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The floating Feedback button: the plain outline button of the transaction summary (Inspect, Refresh), so it
 * reads as a regular control rather than a call to action. The fill is the page ground, not transparent: the
 * button floats over the content, which would show through it.
 */
export const BaseFeedbackWidget = forwardRef<HTMLButtonElement, BaseFeedbackWidgetProps>((props, ref) => (
    <Button
        ref={ref}
        className="cursor-pointer !bg-dark-background hover:!bg-dark-border"
        size="sm"
        variant="outline"
        {...props}
    >
        <MessageCircle />
        Feedback
    </Button>
));
BaseFeedbackWidget.displayName = 'BaseFeedbackWidget';
