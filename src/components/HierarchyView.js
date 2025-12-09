import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Card } from './ui/Card.js';
import { Plus, ChevronRight, Book, Target, Layers, Hash, FileText, Play, Trash2 } from 'lucide-react';

// Icons for each level
const Icons = {
    home: Target,
    goal: Layers,
    subject: Hash,
    topic: FileText,
    subtopic: Book
};

export function HierarchyView() {
    const { goals, currentView, navigate, addGoal, addSubject, addTopic, addSubtopic, addFlashcard, deleteGoal, deleteSubject, deleteTopic, deleteSubtopic, deleteFlashcard } = useStore();
    const [newItemTitle, setNewItemTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Flashcard state
    const [front, setFront] = useState('');
    const [expansion, setExpansion] = useState('');
    const [image, setImage] = useState(null);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 800;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                setImage(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Resolve current context based on ID
    const context = useMemo(() => {
        if (currentView.type === 'home') return { data: goals, type: 'home' };

        // Search for the active item and its parents
        for (const g of goals) {
            if (currentView.type === 'goal' && g.id === currentView.id) return { data: g, parent: null, type: 'goal', goal: g };

            for (const s of g.subjects) {
                if (currentView.type === 'subject' && s.id === currentView.id) return { data: s, parent: g, type: 'subject', goal: g, subject: s };

                for (const t of s.topics) {
                    if (currentView.type === 'topic' && t.id === currentView.id) return { data: t, parent: s, type: 'topic', goal: g, subject: s, topic: t };

                    for (const st of t.subtopics) {
                        if (currentView.type === 'subtopic' && st.id === currentView.id) return { data: st, parent: t, type: 'subtopic', goal: g, subject: s, topic: t, subtopic: st };
                    }
                }
            }
        }
        return null;
    }, [goals, currentView]);

    if (!context) return React.createElement('div', { className: 'text-center p-8 text-slate-400' }, 'Item not found');

    const { data, type, goal, subject, topic, subtopic } = context;

    // Handler for adding items
    const handleAdd = () => {
        if (!newItemTitle.trim()) return;

        if (type === 'home') addGoal(newItemTitle);
        if (type === 'goal') addSubject(goal.id, newItemTitle);
        if (type === 'subject') addTopic(goal.id, subject.id, newItemTitle);
        if (type === 'topic') addSubtopic(goal.id, subject.id, topic.id, newItemTitle);

        setNewItemTitle('');
        setIsAdding(false);
    };

    const handleAddFlashcard = () => {
        if (!front.trim() || !expansion.trim()) return;
        addFlashcard(goal.id, subject.id, topic.id, subtopic.id, front, expansion, image);
        setFront('');
        setExpansion('');
        setImage(null);
        setIsAdding(false);
    };

    // Handler for Delete
    const handleDelete = (e, item) => {
        e.stopPropagation(); // Prevent navigation click
        if (!window.confirm(`Delete "${item.title || item.front}"?`)) return;

        if (type === 'home') deleteGoal(item.id);
        if (type === 'goal') deleteSubject(goal.id, item.id);
        if (type === 'subject') deleteTopic(goal.id, subject.id, item.id);
        if (type === 'topic') deleteSubtopic(goal.id, subject.id, topic.id, item.id);
        if (type === 'subtopic') deleteFlashcard(goal.id, subject.id, topic.id, subtopic.id, item.id);
    };

    // Render List Items
    const renderList = () => {
        const items = type === 'home' ? goals : (type === 'goal' ? data.subjects : (type === 'subject' ? data.topics : data.subtopics));

        if (type === 'subtopic') {
            // Render Flashcards
            return React.createElement('div', { className: 'space-y-4' },
                data.flashcards.length === 0 && React.createElement('div', { className: 'text-center py-10 text-slate-500' }, 'No flashcards yet. Add one!'),
                data.flashcards.map(card =>
                    React.createElement(Card, { key: card.id, className: 'relative group pr-10' },
                        React.createElement('div', { className: 'font-medium text-lg mb-2' }, card.front),
                        React.createElement('div', { className: 'text-slate-400 text-sm border-t border-slate-700/50 pt-2' }, card.expansion),
                        // Flashcard Delete Button
                        React.createElement('button', {
                            onClick: (e) => handleDelete(e, card),
                            className: 'absolute top-3 right-3 text-slate-500 hover:text-red-400 p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity'
                        }, React.createElement(Trash2, { size: 16 }))
                    )
                )
            );
        }

        // Render Hierarchy Items
        return React.createElement('div', { className: 'grid gap-3' },
            items.length === 0 && React.createElement('div', { className: 'text-center py-10 text-slate-500' }, 'Nothing here yet.'),
            items.map(item =>
                React.createElement('div', {
                    key: item.id,
                    onClick: () => navigate(
                        type === 'home' ? 'goal' : (type === 'goal' ? 'subject' : (type === 'subject' ? 'topic' : 'subtopic')),
                        item.id
                    ),
                    className: 'group bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-all active:scale-[0.98]'
                },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('div', { className: 'p-2 rounded-lg bg-blue-500/10 text-blue-400' },
                            // Dynamic Icon based on next level
                            type === 'home' ? React.createElement(Layers, { size: 18 }) :
                                type === 'goal' ? React.createElement(Hash, { size: 18 }) :
                                    type === 'subject' ? React.createElement(FileText, { size: 18 }) :
                                        React.createElement(Book, { size: 18 })
                        ),
                        React.createElement('span', { className: 'font-medium' }, item.title)
                    ),

                    React.createElement('div', { className: 'flex items-center gap-2' },
                        // Delete Button (Hierarchy)
                        React.createElement('button', {
                            onClick: (e) => handleDelete(e, item),
                            className: 'text-slate-500 hover:text-red-400 p-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity'
                        }, React.createElement(Trash2, { size: 18 })),

                        React.createElement(ChevronRight, { size: 16, className: 'text-slate-500' })
                    )
                )
            )
        );
    };

    const titles = {
        home: 'Your Goals',
        goal: 'Subjects',
        subject: 'Topics',
        topic: 'Subtopics',
        subtopic: 'Flashcards'
    };

    return React.createElement('div', { className: 'space-y-6' },
        // Title Section
        React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('h2', { className: 'text-2xl font-bold text-white' },
                type === 'home' ? 'Your Goals' : data.title
            ),
            type === 'subtopic' && data.flashcards.length > 0 && React.createElement(Button, {
                onClick: () => navigate('study', data.id),
                className: 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
            },
                React.createElement(Play, { size: 16, className: 'mr-2' }), 'Study'
            )
        ),

        // Breadcrumb-ish info
        type !== 'home' && React.createElement('div', { className: 'text-sm text-slate-400' },
            titles[type]
        ),

        // Content
        renderList(),

        // Add Button / Form
        isAdding ? (
            React.createElement(Card, { className: 'animate-in fade-in slide-in-from-bottom-4' },
                type === 'subtopic' ? (
                    // Flashcard Form
                    React.createElement('div', { className: 'space-y-3' },
                        React.createElement(Input, {
                            placeholder: 'Front (Question)',
                            value: front,
                            onChange: e => setFront(e.target.value),
                            autoFocus: true
                        }),
                        React.createElement('textarea', {
                            className: 'w-full h-24 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
                            value: expansion,
                            onChange: e => setExpansion(e.target.value)
                        }),
                        React.createElement('div', { className: 'flex items-center gap-4' },
                            React.createElement('label', { className: 'cursor-pointer flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300' },
                                React.createElement(FileText, { size: 16 }),
                                'Add Image',
                                React.createElement('input', {
                                    type: 'file',
                                    accept: 'image/*',
                                    className: 'hidden',
                                    onChange: handleImageSelect
                                })
                            ),
                            image && React.createElement('span', { className: 'text-xs text-green-400' }, 'Image attached')
                        ),
                        image && React.createElement('img', { src: image, className: 'h-20 rounded-lg object-cover border border-slate-700' }),
                        React.createElement('div', { className: 'flex gap-2 justify-end' },
                            React.createElement(Button, { variant: 'ghost', onClick: () => setIsAdding(false) }, 'Cancel'),
                            React.createElement(Button, { onClick: handleAddFlashcard }, 'Save Card')
                        )
                    )
                ) : (
                    // Standard Item Form
                    React.createElement('div', { className: 'flex gap-2' },
                        React.createElement(Input, {
                            placeholder: `New ${titles[type].slice(0, -1)} title...`,
                            value: newItemTitle,
                            onChange: e => setNewItemTitle(e.target.value),
                            autoFocus: true,
                            onKeyDown: e => e.key === 'Enter' && handleAdd()
                        }),
                        React.createElement(Button, { onClick: handleAdd },
                            React.createElement(Plus, { size: 20 })
                        )
                    )
                )
            )
        ) : (
            React.createElement(Button, {
                variant: 'outline',
                className: 'w-full py-4 border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500',
                onClick: () => setIsAdding(true)
            },
                React.createElement(Plus, { size: 18, className: 'mr-2' }),
                type === 'subtopic' ? 'Add Flashcard' : `Add ${titles[type].slice(0, -1)}`
            )
        )
    );
}
