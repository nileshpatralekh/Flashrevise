import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore.js';
import { Button } from './ui/Button.js';
import { Card } from './ui/Card.js';
import { ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function StudyMode() {
    const { goals, currentView, navigate } = useStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    // Find the subtopic
    const subtopic = useMemo(() => {
        for (const g of goals) {
            for (const s of g.subjects) {
                for (const t of s.topics) {
                    for (const st of t.subtopics) {
                        if (st.id === currentView.id) return st;
                    }
                }
            }
        }
        return null;
    }, [goals, currentView]);

    if (!subtopic) return React.createElement('div', null, 'Loading...');

    const cards = subtopic.flashcards;
    const currentCard = cards[currentIndex];

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(c => c + 1), 150);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(c => c - 1), 150);
        }
    };

    const handleFlip = () => setIsFlipped(!isFlipped);

    if (cards.length === 0) {
        return React.createElement('div', { className: 'text-center py-20' },
            React.createElement('div', { className: 'text-xl mb-4' }, 'No cards to study!'),
            React.createElement(Button, { onClick: () => navigate('subtopic', subtopic.id) }, 'Go Back')
        );
    }

    return React.createElement('div', { className: 'flex flex-col h-[calc(100vh-140px)]' },
        // Header / Progress
        React.createElement('div', { className: 'flex items-center justify-between mb-6' },
            React.createElement('div', { className: 'text-sm text-slate-400' },
                `Card ${currentIndex + 1} of ${cards.length}`
            ),
            React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => navigate('subtopic', subtopic.id) },
                React.createElement(X, { size: 20 })
            )
        ),

        // Card Area
        React.createElement('div', { className: 'flex-1 relative perspective-1000' },
            React.createElement(AnimatePresence, { mode: 'wait' },
                React.createElement(motion.div, {
                    key: currentIndex,
                    initial: { opacity: 0, x: 20 },
                    animate: { opacity: 1, x: 0 },
                    exit: { opacity: 0, x: -20 },
                    transition: { duration: 0.2 },
                    className: 'absolute inset-0',
                    onClick: handleFlip
                },
                    React.createElement('div', {
                        className: `w-full h-full transition-all duration-500 transform-style-3d cursor-pointer relative ${isFlipped ? 'rotate-y-180' : ''}`,
                        style: { transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }
                    },
                        // Front
                        React.createElement(Card, {
                            className: 'absolute inset-0 flex flex-col items-center justify-center p-8 text-center backface-hidden border-blue-500/30 bg-slate-800/80',
                            style: { backfaceVisibility: 'hidden' }
                        },
                            React.createElement('div', { className: 'text-sm text-blue-400 uppercase tracking-wider font-semibold mb-4' }, 'Question'),
                            React.createElement('div', { className: 'text-2xl font-medium' }, currentCard.front),
                            React.createElement('div', { className: 'mt-8 text-slate-500 text-sm flex items-center gap-2' },
                                React.createElement(RotateCw, { size: 14 }), 'Tap to flip'
                            )
                        ),

                        // Back
                        React.createElement(Card, {
                            className: 'absolute inset-0 flex flex-col items-center justify-center p-8 text-center backface-hidden border-purple-500/30 bg-slate-800/80 rotate-y-180',
                            style: { backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }
                        },
                            React.createElement('div', { className: 'text-sm text-purple-400 uppercase tracking-wider font-semibold mb-4' }, 'Answer'),
                            React.createElement('div', { className: 'text-xl text-slate-200' }, currentCard.expansion)
                        )
                    )
                )
            )
        ),

        // Controls
        React.createElement('div', { className: 'mt-8 flex items-center justify-between gap-4' },
            React.createElement(Button, {
                variant: 'secondary',
                onClick: handlePrev,
                disabled: currentIndex === 0,
                className: 'flex-1'
            }, React.createElement(ChevronLeft, { size: 20 })),

            React.createElement(Button, {
                variant: 'primary',
                onClick: handleNext,
                disabled: currentIndex === cards.length - 1,
                className: 'flex-1'
            }, React.createElement(ChevronRight, { size: 20 }))
        )
    );
}
