import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils.js';

// Import our new filesystem logic
import { saveToLocalDir, verifyPermission, getDirectoryHandle } from '../lib/filesystem.js';

// Helper to find item in array
const find = (arr, id) => arr.find(item => item.id === id);

export const useStore = create(
    persist(
        (set, get) => ({
            goals: [],
            currentView: { type: 'home', id: null }, // Navigation state

            // Local File System State
            fsConfig: {
                dirHandle: null, // Note: Handles are not sizable via simple JSON persist, so we rely on fs.js to load it + runtime state
                isSaving: false,
                lastSaved: null,
                error: null,
                hasPermission: false
            },

            // Action to verify and set the handle
            setDirHandle: async (handle) => {
                if (!handle) return;
                const granted = await verifyPermission(handle);
                set(state => ({
                    fsConfig: { ...state.fsConfig, hasPermission: granted, error: null }
                }));
            },

            // REPLACES syncToGithub
            saveToDisk: async (manualHandle = null) => {
                // We either use the passed handle (from user selection) or the one we might re-hydrate (if complex IDB logic allowed)
                // For this MVP, we need the UI to provide the handle usually, or we retrieve it from IDB at boot.
                // But handles cannot be stored in Zustand persist (localStorage). They must live in IndexedDB.
                // We rely on the component or init logic to call setDirHandle with the object from `filesystem.js`.

                // NOTE: We cannot easily get the handle from state if it's not serializable. 
                // We should fetch it from `filesystem.js` helper if needed, or pass it in.
                // A better pattern: The handle lives in a module-level variable in filesystem.js or we retrieve it from IDB here.

                // Let's assume we retrieve it fresh to ensure we have the complex object.
                let handle = manualHandle;

                // If not provided, try to get from our IDB helper (purely for the object reference)
                if (!handle) {
                    const { getDirectoryHandle } = await import('../lib/filesystem.js');
                    handle = await getDirectoryHandle();
                }

                if (!handle) {
                    set(state => ({ fsConfig: { ...state.fsConfig, error: "No folder selected" } }));
                    return;
                }

                // Verify permission again (just in case)
                const granted = await verifyPermission(handle);
                if (!granted) {
                    set(state => ({ fsConfig: { ...state.fsConfig, hasPermission: false, error: "Permission needed" } }));
                    return;
                }

                const { goals } = get();
                set(state => ({ fsConfig: { ...state.fsConfig, isSaving: true, error: null } }));

                try {
                    await saveToLocalDir(handle, goals);
                    set(state => ({
                        fsConfig: {
                            ...state.fsConfig,
                            lastSaved: Date.now(),
                            isSaving: false,
                            hasPermission: true
                        }
                    }));
                } catch (err) {
                    console.error("Save error:", err);
                    set(state => ({ fsConfig: { ...state.fsConfig, isSaving: false, error: err.message } }));
                }
            },

            // Navigation Actions
            navigate: (type, id = null) => set({ currentView: { type, id } }),

            // Goal Actions
            addGoal: (title) => {
                set((state) => ({
                    goals: [...state.goals, { id: generateId(), title, subjects: [], createdAt: Date.now() }]
                }));
                get().saveToDisk(); // Auto-save
            },

            deleteGoal: (id) => {
                set((state) => ({
                    goals: state.goals.filter(g => g.id !== id)
                }));
                get().saveToDisk(); // Auto-save
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
                get().saveToDisk(); // Auto-save
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
                get().saveToDisk(); // Auto-save
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
                get().saveToDisk(); // Auto-save
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
                get().saveToDisk(); // Auto-save
            },
        }),
        {
            name: 'flashrevise-storage',
            // Omit fsConfig from localStorage persistence as it contains non-serializable data or transient state
            partialize: (state) => ({ goals: state.goals, currentView: state.currentView }),
        }
    )
);
