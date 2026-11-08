import React from 'react';

export const InputOTP = ({ children, ...props }) => (
  <div className="flex gap-2 justify-center" {...props}>
    {children}
  </div>
);

export const InputOTPGroup = ({ children, className = '', ...props }) => (
  <div className={`flex gap-1 ${className}`} {...props}>
    {children}
  </div>
);

export const InputOTPSlot = ({ index, ...props }) => (
  <div
    className="w-10 h-12 border border-slate-300 rounded flex items-center justify-center font-mono text-lg font-bold bg-white"
    {...props}
  >
    -
  </div>
);

