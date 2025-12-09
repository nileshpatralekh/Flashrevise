import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils.js';

// Helper to find item in array
const find = (arr, id) => arr.find(item => item.id === id);

export const useStore = create(
    persist(
        (set, get) => ({
            goals: [],
            currentView: { type: 'home', id: null }, // Navigation state

            // Navigation Actions
            navigate: (type, id = null) => set({ currentView: { type, id } }),

            // Goal Actions
            addGoal: (title) => set((state) => ({
                goals: [...state.goals, { id: generateId(), title, subjects: [], createdAt: Date.now() }]
            })),

            deleteGoal: (id) => set((state) => ({
                goals: state.goals.filter(g => g.id !== id)
            })),

            // Subject Actions
            addSubject: (goalId, title) => set((state) => ({
                goals: state.goals.map(g => {
                    if (g.id !== goalId) return g;
                    return {
                        ...g,
                        subjects: [...g.subjects, { id: generateId(), title, topics: [], createdAt: Date.now() }]
                    };
                })
            })),

            // Topic Actions
            addTopic: (goalId, subjectId, title) => set((state) => ({
                goals: state.goals.map(g => {
                    if (g.id !== goalId) return g;
                    return {
                        ...g,
                        subjects: g.subjects.map(s => {
                            if (s.id !== subjectId) return s;
                            return {
                                ...s,
                                topics: [...s.topics, { id: generateId(), title, subtopics: [], createdAt: Date.now() }]
                            };
                        })
                    };
                })
            })),

            // Subtopic Actions
            addSubtopic: (goalId, subjectId, topicId, title) => set((state) => ({
                goals: state.goals.map(g => {
                    if (g.id !== goalId) return g;
                    return {
                        ...g,
                        subjects: g.subjects.map(s => {
                            if (s.id !== subjectId) return s;
                            return {
                                ...s,
                                topics: s.topics.map(t => {
                                    if (t.id !== topicId) return t;
                                    return {
                                        ...t,
                                        subtopics: [...t.subtopics, { id: generateId(), title, flashcards: [], createdAt: Date.now() }]
                                    };
                                })
                            };
                        })
                    };
                })
            })),

            // Flashcard Actions
            addFlashcard: (goalId, subjectId, topicId, subtopicId, front, expansion) => set((state) => ({
                goals: state.goals.map(g => {
                    if (g.id !== goalId) return g;
                    return {
                        ...g,
                        subjects: g.subjects.map(s => {
                            if (s.id !== subjectId) return s;
                            return {
                                ...s,
                                topics: s.topics.map(t => {
                                    if (t.id !== topicId) return t;
                                    return {
                                        ...t,
                                        subtopics: t.subtopics.map(st => {
                                            if (st.id !== subtopicId) return st;
                                            return {
                                                ...st,
                                                flashcards: [...st.flashcards, {
                                                    id: generateId(),
                                                    front,
                                                    expansion,
                                                    createdAt: Date.now(),
                                                    mastery: 0 // 0-5 scale
                                                }]
                                            };
                                        })
                                    };
                                })
                            };
                        })
                    };
                })
            })),

            // Generic Delete (Simplified for now, just filtering deep)
            // For a real app, we'd want specific delete actions or a recursive delete helper.
            // I'll add specific deletes if needed, but for now let's rely on the user not making mistakes or add later.
        }),
        {
            name: 'flashrevise-storage',
        }
    )
);
