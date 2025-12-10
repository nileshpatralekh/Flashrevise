import React, { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Card } from './ui/Card.js';
import { Save, RefreshCw, X, CheckCircle, AlertCircle, Folder, Activity } from 'lucide-react';
import { selectDirectory, diagnoseFileSystem, isFileSystemSupported } from '../lib/filesystem.js';

export function Settings({ onClose }) {
    const { fsConfig, saveToDisk, setDirHandle } = useStore();
    const [diagLog, setDiagLog] = useState(null);

    const handleSelectFolder = async () => {
        try {
            alert("Starting folder selection...");
            const handle = await selectDirectory();
            alert(`Selected: ${handle ? handle.name : 'NULL'}`);

            if (handle) {
                alert("Setting handle to store...");
                await setDirHandle(handle);
                alert("Handle set. Verifying...");

                // Direct access check
                if (useStore.getState().fsConfig.dirHandle) {
                    alert("Store confirms handle is present.");
                } else {
                    alert("ERROR: Store handle is MISSING after set!");
                }

                await saveToDisk(handle);
            } else {
                alert("Selection cancelled or failed.");
            }
        } catch (err) {
            alert(`Selection Error: ${err.message}`);
            console.error(err);
        }
    };

    const handleDiagnose = async () => {
        if (!fsConfig.dirHandle) return;
        setDiagLog(['Running diagnostics...']);
        const result = await diagnoseFileSystem(fsConfig.dirHandle);
        setDiagLog(result.logs);
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
                        React.createElement('div', null,
                            React.createElement('h3', { className: 'font-semibold' }, 'Local File System'),
                            fsConfig.folderName && React.createElement('p', { className: 'text-xs text-green-400 font-mono' }, fsConfig.folderName)
                        )
                    ),
                    React.createElement('p', { className: 'text-sm text-slate-400 mb-4' },
                        'Select a folder on your device. Your flashcards will be saved there as real nested files.'
                    ),

                    React.createElement(Button, {
                        onClick: handleSelectFolder,
                        className: 'w-full mb-4',
                        // Disable if not supported, but actually we'll hide it or change behavior below
                        disabled: !isFileSystemSupported
                    },
                        React.createElement(Folder, { size: 16, className: 'mr-2' }),
                        isFileSystemSupported
                            ? (fsConfig.folderName ? 'Change Folder' : 'Select Folder')
                            : 'Folder Access Not Supported on Android'
                    ),

                    !isFileSystemSupported && React.createElement('div', { className: 'mb-4 text-xs text-yellow-400 bg-yellow-500/10 p-3 rounded' },
                        "Android browsers do not support direct folder access yet. Your data is saved internally in the app. Use 'Export Data' below to backup."
                    ),

                    // Fallback Export for Android
                    !isFileSystemSupported && React.createElement(Button, {
                        onClick: () => {
                            const data = JSON.stringify(useStore.getState().goals, null, 2);
                            const blob = new Blob([data], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `flashrevise_backup_${Date.now()}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        },
                        variant: 'secondary',
                        className: 'w-full mb-4'
                    }, React.createElement(Save, { size: 16, className: 'mr-2' }), "Export / Download Data"),

                    isFileSystemSupported && React.createElement('div', { className: 'border-t border-slate-700/50 pt-4 space-y-2' },
                        React.createElement('h4', { className: 'text-xs font-semibold text-slate-500 uppercase tracking-wider' }, 'Diagnostics'),
                        React.createElement(Button, {
                            onClick: handleDiagnose,
                            variant: 'outline',
                            size: 'sm',
                            className: 'w-full text-xs',
                            disabled: !fsConfig.dirHandle
                        },
                            React.createElement(Activity, { size: 14, className: 'mr-2' }), 'Test Write Permissions'
                        ),

                        React.createElement(Button, {
                            onClick: async () => {
                                try {
                                    setDiagLog(['Saving...']);
                                    console.log('Force saving...');
                                    await saveToDisk();
                                    setDiagLog(prev => [...prev || [], 'Save Success! check folder now.']);
                                    alert("Save Successful!");
                                } catch (e) {
                                    console.error(e);
                                    setDiagLog(prev => [...prev || [], `Save Failed: ${e.message}`]);
                                    alert(`Save Failed: ${e.message}`);
                                }
                            },
                            variant: 'secondary',
                            size: 'sm',
                            className: 'w-full text-xs',
                            disabled: !fsConfig.dirHandle
                        },
                            React.createElement(Save, { size: 14, className: 'mr-2' }), 'Force Save Now'
                        )
                    ),

                    fsConfig.error && React.createElement('div', { className: 'mt-2 p-2 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/50' },
                        React.createElement(AlertCircle, { size: 12, className: 'inline mr-1' }),
                        fsConfig.error
                    ),

                    diagLog && React.createElement('div', { className: 'mt-4 bg-black/50 p-3 rounded text-xs font-mono text-slate-300 max-h-32 overflow-y-auto' },
                        diagLog.map((line, i) => React.createElement('div', { key: i }, line))
                    )
                ),

                React.createElement('div', { className: 'mt-4 text-center' },
                    React.createElement('span', { className: 'text-[10px] text-slate-600 font-mono' }, 'v1.2-DEBUG-BUILD')
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
