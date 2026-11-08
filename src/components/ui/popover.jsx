import React from 'react';

export const Popover = ({ children }) => <div>{children}</div>;
export const PopoverTrigger = ({ asChild, children, ...props }) => <div {...props}>{children}</div>;
export const PopoverContent = ({ children, className = '', ...props }) => (
  <div className={`p-4 bg-white shadow-lg rounded-lg border ${className}`} {...props}>
    {children}
  </div>
);

