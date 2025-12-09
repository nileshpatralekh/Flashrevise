import React from 'react';
import { cn } from '../../lib/utils.js';

export function Card({ className, ...props }) {
    return React.createElement('div', {
        className: cn(
            'rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-6 text-slate-100 shadow-xl',
            className
        ),
        ...props
    });
}
