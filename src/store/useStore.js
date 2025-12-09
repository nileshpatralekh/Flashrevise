import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils.js';

import { fetchRepoData, syncTree } from '../lib/github.js';

// Helper to find item in array
const find = (arr, id) => arr.find(item => item.id === id);

export const useStore = create(
    persist(
        (set, get) => ({
            goals: [],
            currentView: { type: 'home', id: null }, // Navigation state

            // GitHub Sync State
            githubConfig: {
                token: '',
                owner: 'nileshpatralekh', // Default, can be changed
                repo: 'Flashrevise', // Default
                lastSynced: null,
                sha: null,
                isSyncing: false,
                error: null
            },

            setGithubConfig: (config) => set(state => ({
                githubConfig: { ...state.githubConfig, ...config }
            })),

            syncFromGithub: async () => {
                const { token, owner, repo } = get().githubConfig;
                if (!token) return;

                set(state => ({ githubConfig: { ...state.githubConfig, isSyncing: true, error: null } }));
                try {
                    const result = await fetchRepoData(token, owner, repo);
                    if (result) {
                        set(state => ({
                            goals: result.content,
                            githubConfig: {
                                ...state.githubConfig,
                                sha: result.sha,
                                lastSynced: Date.now(),
                                isSyncing: false
                            }
                        }));
                    } else {
                        // File doesn't exist, maybe first sync. Do nothing to local data, just ready to save.
                        set(state => ({ githubConfig: { ...state.githubConfig, isSyncing: false } }));
                    }
                } catch (error) {
                    set(state => ({ githubConfig: { ...state.githubConfig, isSyncing: false, error: error.message } }));
                }
            },

            syncToGithub: async () => {
                const { token, owner, repo } = get().githubConfig;
                const { goals } = get();
                if (!token) return;

                set(state => ({ githubConfig: { ...state.githubConfig, isSyncing: true, error: null } }));
                try {
                    const newSha = await syncTree(token, owner, repo, goals);
                    set(state => ({
                        githubConfig: {
                            ...state.githubConfig,
                            sha: newSha,
                            lastSynced: Date.now(),
                            isSyncing: false
                        }
                    }));
                } catch (error) {
                    set(state => ({ githubConfig: { ...state.githubConfig, isSyncing: false, error: error.message } }));
                }
            },

            // Navigation Actions
            navigate: (type, id = null) => set({ currentView: { type, id } }),

            // Goal Actions
            addGoal: (title) => {
                set((state) => ({
                    goals: [...state.goals, { id: generateId(), title, subjects: [], createdAt: Date.now() }]
                }));
                get().syncToGithub(); // Auto-save
            },

            deleteGoal: (id) => {
                set((state) => ({
                    goals: state.goals.filter(g => g.id !== id)
                }));
                get().syncToGithub(); // Auto-save
            },

            // Subject Actions
            addSubject: (goalId, title) => {
                set((state) => ({
                    goals: state.goals.map(g => {
                        if (g.id !== goalId) return g;
                        return {
                            ...g,
                            subjects: [...g.subjects, { id: generateId(), title, topics: [], createdAt: Date.now() }]
                        };
                    })
                }));
                get().syncToGithub(); // Auto-save
            },

            // Topic Actions
            addTopic: (goalId, subjectId, title) => {
                set((state) => ({
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
                }));
                get().syncToGithub(); // Auto-save
            },

            // Subtopic Actions
            addSubtopic: (goalId, subjectId, topicId, title) => {
                set((state) => ({
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
                }));
                get().syncToGithub(); // Auto-save
            },

            // Flashcard Actions
            addFlashcard: (goalId, subjectId, topicId, subtopicId, front, expansion, image = null) => {
                set((state) => ({
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
                                                        image,
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
                }));
                get().syncToGithub(); // Auto-save
            },

            // Generic Delete (Simplified for now, just filtering deep)
            // For a real app, we'd want specific delete actions or a recursive delete helper.
            // I'll add specific deletes if needed, but for now let's rely on the user not making mistakes or add later.
        }),
        {
            name: 'flashrevise-storage',
        }
    )
);
