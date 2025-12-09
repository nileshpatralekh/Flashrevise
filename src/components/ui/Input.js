import React from 'react';
import { cn } from '../../lib/utils.js';

export function Input({ className, ...props }) {
    return React.createElement('input', {
        className: cn(
            'flex h-12 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm ring-offset-slate-900 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white',
            className
        ),
        ...props
    });
}
