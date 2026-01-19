import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, icon, disabled, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            {icon}
          </div>
        )}
        <select
          className={cn(
            'w-full appearance-none rounded-lg border border-input bg-background text-sm',
            'px-3 py-2.5 pr-10',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'hover:border-primary/50 transition-all duration-200',
            'cursor-pointer',
            icon && 'pl-10',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          disabled={disabled}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
