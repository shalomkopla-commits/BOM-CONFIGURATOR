import React from 'react';

export const Label = React.forwardRef(({ className = '', children, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
});
Label.displayName = 'Label';
