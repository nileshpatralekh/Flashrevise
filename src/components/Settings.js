import React, { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Card } from './ui/Card.js';
import { Save, RefreshCw, X, CheckCircle, AlertCircle, Folder } from 'lucide-react';
import { selectDirectory } from '../lib/filesystem.js';

export function Settings({ onClose }) {
    const { fsConfig, saveToDisk, setDirHandle } = useStore();

    const handleSelectFolder = async () => {
        const handle = await selectDirectory();
        if (handle) {
            await setDirHandle(handle);
            saveToDisk(handle); // Initial save/test
        }
    };

    return React.createElement('div', { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4' },
        React.createElement(Card, { className: 'w-full max-w-md relative animate-in fade-in zoom-in-95' },
            React.createElement('button', {
                onClick: onClose,
                className: 'absolute top-4 right-4 text-slate-400 hover:text-white'
            }, React.createElement(X, { size: 20 })),

            React.createElement('h2', { className: 'text-xl font-bold mb-6' }, 'Storage Settings'),

            React.createElement('div', { className: 'space-y-6' },
                React.createElement('div', { className: 'bg-slate-800/50 p-4 rounded-lg border border-slate-700' },
                    React.createElement('div', { className: 'flex items-center gap-3 mb-2' },
                        React.createElement('div', { className: 'p-2 bg-blue-500/20 rounded-full text-blue-400' },
                            React.createElement(Folder, { size: 24 })
                        ),
                        React.createElement('h3', { className: 'font-semibold' }, 'Local File System')
                    ),
                    React.createElement('p', { className: 'text-sm text-slate-400 mb-4' },
                        'Select a folder on your device. Your flashcards will be saved there as real nested files.'
                    ),

                    React.createElement(Button, { onClick: handleSelectFolder, className: 'w-full' },
                        React.createElement(Folder, { size: 16, className: 'mr-2' }),
                        fsConfig.hasPermission ? 'Change Folder' : 'Select Folder'
                    )
                ),

                React.createElement('div', { className: 'border-t border-slate-700 my-4' }),

                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', { className: 'text-sm' },
                        fsConfig.isSaving ? React.createElement('span', { className: 'text-blue-400 flex items-center gap-2' },
                            React.createElement(RefreshCw, { size: 14, className: 'animate-spin' }), 'Saving...'
                        ) : fsConfig.error ? React.createElement('span', { className: 'text-red-400 flex items-center gap-2' },
                            React.createElement(AlertCircle, { size: 14 }), 'Save Error'
                        ) : fsConfig.lastSaved ? React.createElement('span', { className: 'text-green-400 flex items-center gap-2' },
                            React.createElement(CheckCircle, { size: 14 }), 'Saved Locally'
                        ) : React.createElement('span', { className: 'text-slate-500' }, 'No folder selected')
                    ),

                    // Only show manual save if permission exists
                    fsConfig.hasPermission && React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => saveToDisk() },
                        React.createElement(Save, { size: 16 })
                    )
                ),

                fsConfig.error && React.createElement('div', { className: 'text-xs text-red-400 bg-red-500/10 p-2 rounded' },
                    fsConfig.error
                )
            )
        )
    );
}
