import React from 'react';

export const Command = ({ children, className = '', ...props }) => <div className={className} {...props}>{children}</div>;
export const CommandInput = ({ placeholder, ...props }) => (
  <input placeholder={placeholder} className="w-full border-b p-2 text-sm" {...props} />
);
export const CommandList = ({ children, ...props }) => <div {...props}>{children}</div>;
export const CommandEmpty = ({ children, ...props }) => <div className="p-2 text-sm text-slate-500" {...props}>{children}</div>;
export const CommandGroup = ({ children, ...props }) => <div {...props}>{children}</div>;
export const CommandItem = ({ children, onSelect, className = '', ...props }) => (
  <div onClick={onSelect} className={`p-2 hover:bg-slate-100 cursor-pointer text-sm ${className}`} {...props}>{children}</div>
);
