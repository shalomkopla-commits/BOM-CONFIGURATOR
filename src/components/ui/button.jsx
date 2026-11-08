import React from 'react';

export const Button = React.forwardRef(({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';
