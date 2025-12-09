import React from 'react';
import { useStore } from './store/useStore.js';
import { HierarchyView } from './components/HierarchyView.js';
import { StudyMode } from './components/StudyMode.js';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function App() {
    const { currentView, navigate } = useStore();

    const handleBack = () => {
        // Simple back logic: go up one level
        // This requires knowing the parent. For now, let's just go Home if not Home.
        // A better way is to store the "path" in the view state.
        // For this MVP, I'll rely on the HierarchyView to handle "Up" navigation or just go Home.
        if (currentView.type !== 'home') {
            // If we are deep, we need to know where to go. 
            // I'll implement a smarter back in HierarchyView.
            navigate('home');
        }
    };

    return React.createElement('div', { className: 'min-h-screen bg-slate-950 text-slate-100 pb-20' },
        // Header
        React.createElement('header', { className: 'sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-4' },
            React.createElement('div', { className: 'mx-auto max-w-2xl flex items-center gap-4' },
                currentView.type !== 'home' && React.createElement('button', {
                    onClick: handleBack,
                    className: 'p-2 rounded-full hover:bg-slate-800 transition-colors'
                }, React.createElement(ArrowLeft, { size: 20 })),

                React.createElement('div', { className: 'flex-1' },
                    React.createElement('h1', { className: 'text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' },
                        'FlashRevise'
                    )
                ),

                React.createElement('div', { className: 'w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400' },
                    React.createElement(BookOpen, { size: 16 })
                )
            )
        ),

        // Main Content
        React.createElement('main', { className: 'mx-auto max-w-2xl p-4' },
            currentView.type === 'study'
                ? React.createElement(StudyMode)
                : React.createElement(HierarchyView)
        )
    );
}
