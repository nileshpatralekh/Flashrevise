import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils.js';

// Import Google Drive logic
import { loadGapi, loadGis, handleAuthClick, handleSignoutClick, saveToDrive, loadFromDrive } from '../lib/googleDrive.js';

// Helper to find item in array
const find = (arr, id) => arr.find(item => item.id === id);

export const useStore = create(
    persist(
        (set, get) => ({
            goals: [],
            currentView: { type: 'home', id: null }, // Navigation state

            // Google Drive State
            driveConfig: {
                isInitialized: false,
                isSignedIn: false,
                user: null, // Basic profile info if needed
                isSaving: false,
                lastSaved: null,
                error: null,
            },

            // Initialize Google Services
            initDrive: async () => {
                try {
                    await loadGapi();
                    await loadGis((tokenResponse) => {
                        // Callback when token received (SignIn successful)
                        set(state => ({
                            driveConfig: { ...state.driveConfig, isSignedIn: true, error: null }
                        }));
                        // Auto-load data after sign in
                        get().syncFromDrive();
                    });

                    // Check initial sign-in status (approximation, valid token check is complex without user interaction or cached token)
                    // For now we assume signed out until user clicks Sign In or we have a valid token hook.
                    set(state => ({
                        driveConfig: { ...state.driveConfig, isInitialized: true }
                    }));

                } catch (err) {
                    console.error("Failed to init Drive", err);
                    set(state => ({
                        driveConfig: { ...state.driveConfig, isInitialized: true, error: "Failed to load Google Services" }
                    }));
                }
            },

            signIn: () => {
                handleAuthClick();
            },

            signOut: () => {
                handleSignoutClick();
                set(state => ({
                    driveConfig: { ...state.driveConfig, isSignedIn: false, user: null }
                }));
            },

            // Load data from Drive overwriting local state
            syncFromDrive: async () => {
                const { driveConfig } = get();
                // if (!driveConfig.isSignedIn) return; // Strict check?

                try {
                    const data = await loadFromDrive('flashrevise_data.json');
                    if (data) {
                        try {
                            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                            if (Array.isArray(parsed)) {
                                set({ goals: parsed });
                                console.log("Synced from Drive:", parsed);
                            }
                        } catch (e) {
                            console.warn("Invalid data from Drive", e);
                        }
                    }
                } catch (err) {
                    console.error("Sync from Drive failed", err);
                    // set(state => ({ driveConfig: { ...state.driveConfig, error: "Sync failed" } }));
                }
            },

            // Save all goals to a single JSON file on Drive
            saveToCloud: async () => {
                const { goals, driveConfig } = get();
                if (!driveConfig.isSignedIn) return;

                set(state => ({ driveConfig: { ...state.driveConfig, isSaving: true, error: null } }));

                try {
                    await saveToDrive('flashrevise_data.json', goals);
                    set(state => ({
                        driveConfig: {
                            ...state.driveConfig,
                            isSaving: false,
                            lastSaved: Date.now()
                        }
                    }));
                } catch (err) {
                    console.error("Save to Drive failed", err);
                    set(state => ({ driveConfig: { ...state.driveConfig, isSaving: false, error: err.message } }));
                }
            },

            // Navigation Actions
            navigate: (type, id = null) => set({ currentView: { type, id } }),

            // Goal Actions
            addGoal: (title) => {
                set((state) => ({
                    goals: [...state.goals, { id: generateId(), title, subjects: [], createdAt: Date.now() }]
                }));
                get().saveToCloud(); // Auto-save
            },

            deleteGoal: async (id) => {
                set((state) => ({
                    goals: state.goals.filter(g => g.id !== id)
                }));
                get().saveToCloud();
            },

            // Subject Actions
            addSubject: async (goalId, title) => {
                set((state) => ({
                    goals: state.goals.map(g => {
                        if (g.id !== goalId) return g;
                        return {
                            ...g,
                            subjects: [...g.subjects, { id: generateId(), title, topics: [], createdAt: Date.now() }]
                        };
                    })
                }));
                get().saveToCloud();
            },

            deleteSubject: async (goalId, subjectId) => {
                set((state) => ({
                    goals: state.goals.map(g => {
                        if (g.id !== goalId) return g;
                        return { ...g, subjects: g.subjects.filter(s => s.id !== subjectId) };
                    })
                }));
                get().saveToCloud();
            },

            // Topic Actions
            addTopic: async (goalId, subjectId, title) => {
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
                get().saveToCloud();
            },

            deleteTopic: async (goalId, subjectId, topicId) => {
                set((state) => ({
                    goals: state.goals.map(g => {
                        if (g.id !== goalId) return g;
                        return {
                            ...g,
                            subjects: g.subjects.map(s => {
                                if (s.id !== subjectId) return s;
                                return { ...s, topics: s.topics.filter(t => t.id !== topicId) };
                            })
                        };
                    })
                }));
                get().saveToCloud();
            },

            // Subtopic Actions
            addSubtopic: async (goalId, subjectId, topicId, title) => {
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
                get().saveToCloud();
            },

            deleteSubtopic: async (goalId, subjectId, topicId, subtopicId) => {
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
                                        return { ...t, subtopics: t.subtopics.filter(st => st.id !== subtopicId) };
                                    })
                                };
                            })
                        };
                    })
                }));
                get().saveToCloud();
            },

            // Flashcard Actions
            addFlashcard: async (goalId, subjectId, topicId, subtopicId, front, expansion, image = null) => {
                const newCard = {
                    id: generateId(),
                    front,
                    expansion,
                    image,
                    createdAt: Date.now(),
                    mastery: 0
                };

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
                                                    flashcards: [...st.flashcards, newCard]
                                                };
                                            })
                                        };
                                    })
                                };
                            })
                        };
                    })
                }));
                get().saveToCloud();
            },

            deleteFlashcard: (goalId, subjectId, topicId, subtopicId, cardId) => {
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
                                                    flashcards: st.flashcards.filter(c => c.id !== cardId)
                                                };
                                            })
                                        };
                                    })
                                };
                            })
                        };
                    })
                }));
                get().saveToCloud();
            },
        }),
        {
            name: 'flashrevise-storage',
            partialize: (state) => ({ goals: state.goals, currentView: state.currentView }),
        }
    )
);
