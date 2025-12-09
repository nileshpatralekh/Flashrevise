import React from 'react';
import { cn } from '../../lib/utils.js';

export function Button({ className, variant = 'primary', size = 'md', ...props }) {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30',
        secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
        ghost: 'hover:bg-slate-800 text-slate-300 hover:text-white',
        outline: 'border-2 border-slate-700 hover:border-slate-600 text-slate-300'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg'
    };

    return React.createElement('button', {
        className: cn(
            'inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
            variants[variant],
            sizes[size],
            className
        ),
        ...props
    });
}
