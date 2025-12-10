import React, { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { Button } from './ui/Button.js';
import { Card } from './ui/Card.js';
import { Save, RefreshCw, X, CheckCircle, AlertCircle, Cloud, LogOut } from 'lucide-react';

export function Settings({ onClose }) {
    const { driveConfig, signIn, signOut, saveToCloud, syncFromDrive } = useStore();

    return React.createElement('div', { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4' },
        React.createElement(Card, { className: 'w-full max-w-md relative animate-in fade-in zoom-in-95' },
            React.createElement('button', {
                onClick: onClose,
                className: 'absolute top-4 right-4 text-slate-400 hover:text-white'
            }, React.createElement(X, { size: 20 })),

            React.createElement('h2', { className: 'text-xl font-bold mb-6' }, 'Cloud Settings'),

            React.createElement('div', { className: 'space-y-6' },
                React.createElement('div', { className: 'bg-slate-800/50 p-4 rounded-lg border border-slate-700' },
                    React.createElement('div', { className: 'flex items-center gap-3 mb-2' },
                        React.createElement('div', { className: 'p-2 bg-blue-500/20 rounded-full text-blue-400' },
                            React.createElement(Cloud, { size: 24 })
                        ),
                        React.createElement('div', null,
                            React.createElement('h3', { className: 'font-semibold' }, 'Google Drive Sync'),
                            driveConfig.isSignedIn
                                ? React.createElement('p', { className: 'text-xs text-green-400 font-mono' }, 'Signed In')
                                : React.createElement('p', { className: 'text-xs text-slate-400 font-mono' }, 'Not Signed In')
                        )
                    ),

                    React.createElement('p', { className: 'text-sm text-slate-400 mb-4' },
                        'Sync your flashcards directly to your Google Drive. No local files required.'
                    ),

                    !driveConfig.isSignedIn ? React.createElement(Button, {
                        onClick: signIn,
                        className: 'w-full mb-4 bg-white text-black hover:bg-slate-200'
                    },
                        // Simple SVG G logo or just text
                        React.createElement('span', { className: 'font-semibold' }, 'Sign in with Google')
                    ) : React.createElement('div', { className: 'space-y-2' },
                        React.createElement(Button, {
                            onClick: signOut,
                            variant: 'outline',
                            className: 'w-full text-xs'
                        },
                            React.createElement(LogOut, { size: 14, className: 'mr-2' }), 'Sign Out'
                        ),
                        React.createElement(Button, {
                            onClick: syncFromDrive,
                            variant: 'secondary',
                            className: 'w-full text-xs',
                            disabled: driveConfig.isSaving
                        },
                            React.createElement(RefreshCw, { size: 14, className: 'mr-2' + (driveConfig.isSaving ? ' animate-spin' : '') }), 'Force Sync from Drive'
                        )
                    ),

                    driveConfig.error && React.createElement('div', { className: 'mt-2 p-2 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/50' },
                        React.createElement(AlertCircle, { size: 12, className: 'inline mr-1' }),
                        driveConfig.error
                    )
                ),

                React.createElement('div', { className: 'mt-4 text-center' },
                    React.createElement('span', { className: 'text-[10px] text-slate-600 font-mono' }, 'v2.0-CLOUD-BETA')
                ),

                React.createElement('div', { className: 'border-t border-slate-700 my-4' }),

                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', { className: 'text-sm' },
                        driveConfig.isSaving ? React.createElement('span', { className: 'text-blue-400 flex items-center gap-2' },
                            React.createElement(RefreshCw, { size: 14, className: 'animate-spin' }), 'Saving...'
                        ) : driveConfig.error ? React.createElement('span', { className: 'text-red-400 flex items-center gap-2' },
                            React.createElement(AlertCircle, { size: 14 }), 'Save Error'
                        ) : driveConfig.lastSaved ? React.createElement('span', { className: 'text-green-400 flex items-center gap-2' },
                            React.createElement(CheckCircle, { size: 14 }), 'Synced'
                        ) : React.createElement('span', { className: 'text-slate-500' }, 'Changes auto-save')
                    ),

                    // Manual save button
                    driveConfig.isSignedIn && React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => saveToCloud() },
                        React.createElement(Save, { size: 16 })
                    )
                )
            )
        )
    );
}
