import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils.js';

// Import our new filesystem logic
import { saveToLocalDir, verifyPermission, getDirectoryHandle, deleteItem, createItem, saveFile } from '../lib/filesystem.js';

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
                const name = handle.name || "Local Folder";
                set(state => ({
                    fsConfig: {
                        ...state.fsConfig,
                        dirHandle: handle,
                        folderName: name,
                        hasPermission: granted,
                        error: null
                    }
                }));
            },

            // Attempt to restore handle from IDB on boot
            restoreHandle: async () => {
                const { getDirectoryHandle: getFromIDB, verifyPermission } = await import('../lib/filesystem.js');
                const handle = await getFromIDB();
                if (handle) {
                    // We have a stored handle!
                    // On reload, permission is usually 'prompt', which counts as false for 'hasPermission' until verified
                    const granted = await verifyPermission(handle, false); // check existing without prompting
                    const name = handle.name || "Local Folder";
                    set(state => ({
                        fsConfig: {
                            ...state.fsConfig,
                            dirHandle: handle,
                            folderName: name,
                            hasPermission: granted,
                            error: null
                        }
                    }));
                }
            },

            // REPLACES syncToGithub
            saveToDisk: async (manualHandle = null) => {
                // 1. Try to use manual handle (e.g. from Settings select)
                // 2. Or use the one currently in state
                // 3. Or try to fetch from IDB as last resort
                let handle = manualHandle || get().fsConfig.dirHandle;

                if (!handle) {
                    try {
                        const { getDirectoryHandle } = await import('../lib/filesystem.js');
                        handle = await getDirectoryHandle();
                    } catch (e) {
                        console.warn("IDB fetch failed", e);
                    }
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

            deleteGoal: async (id) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === id);
                if (goal) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) await deleteItem(handle, [goal.title]);
                }

                set((state) => ({
                    goals: state.goals.filter(g => g.id !== id)
                }));
                get().saveToDisk(); // Update app_data.json
            },

            // Subject Actions
            addSubject: async (goalId, title) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === goalId);

                // 1. Physical Creation
                if (goal) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) await createItem(handle, [goal.title, title]);
                }

                // 2. State Update
                set((state) => ({
                    goals: state.goals.map(g => {
                        if (g.id !== goalId) return g;
                        return {
                            ...g,
                            subjects: [...g.subjects, { id: generateId(), title, topics: [], createdAt: Date.now() }]
                        };
                    })
                }));
                get().saveToDisk(); // Still auto-save metadata
            },

            deleteSubject: async (goalId, subjectId) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === goalId);
                const subject = goal?.subjects.find(s => s.id === subjectId);
                if (goal && subject) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) await deleteItem(handle, [goal.title, subject.title]);
                }

                set((state) => ({
                    goals: state.goals.map(g => {
                        if (g.id !== goalId) return g;
                        return { ...g, subjects: g.subjects.filter(s => s.id !== subjectId) };
                    })
                }));
                get().saveToDisk();
            },

            // Topic Actions
            addTopic: async (goalId, subjectId, title) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === goalId);
                const subject = goal?.subjects.find(s => s.id === subjectId);

                if (goal && subject) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) await createItem(handle, [goal.title, subject.title, title]);
                }

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

            deleteTopic: async (goalId, subjectId, topicId) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === goalId);
                const subject = goal?.subjects.find(s => s.id === subjectId);
                const topic = subject?.topics.find(t => t.id === topicId);
                if (goal && subject && topic) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) await deleteItem(handle, [goal.title, subject.title, topic.title]);
                }

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
                get().saveToDisk();
            },

            // Subtopic Actions
            addSubtopic: async (goalId, subjectId, topicId, title) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === goalId);
                const subject = goal?.subjects.find(s => s.id === subjectId);
                const topic = subject?.topics.find(t => t.id === topicId);

                if (goal && subject && topic) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) await createItem(handle, [goal.title, subject.title, topic.title, title]);
                }

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

            deleteSubtopic: async (goalId, subjectId, topicId, subtopicId) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === goalId);
                const subject = goal?.subjects.find(s => s.id === subjectId);
                const topic = subject?.topics.find(t => t.id === topicId);
                const subtopic = topic?.subtopics.find(st => st.id === subtopicId);

                if (goal && subject && topic && subtopic) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) await deleteItem(handle, [goal.title, subject.title, topic.title, subtopic.title]);
                }

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
                get().saveToDisk();
            },

            // Flashcard Actions
            addFlashcard: async (goalId, subjectId, topicId, subtopicId, front, expansion, image = null) => {
                const { goals, fsConfig } = get();
                const goal = goals.find(g => g.id === goalId);
                const subject = goal?.subjects.find(s => s.id === subjectId);
                const topic = subject?.topics.find(t => t.id === topicId);
                const subtopic = topic?.subtopics.find(st => st.id === subtopicId);

                // Prepare new card logic
                const newCard = {
                    id: generateId(),
                    front,
                    expansion,
                    image,
                    createdAt: Date.now(),
                    mastery: 0
                };

                // 1. Physical Save (Append to flashcards.json)
                if (goal && subject && topic && subtopic) {
                    const handle = fsConfig.dirHandle || await getDirectoryHandle();
                    if (handle) {
                        const updatedCards = [...subtopic.flashcards, newCard];
                        await saveFile(
                            handle,
                            [goal.title, subject.title, topic.title, subtopic.title],
                            'flashcards.json',
                            JSON.stringify(updatedCards, null, 2)
                        );
                    }
                }

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
                get().saveToDisk(); // Auto-save metadata
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
                get().saveToDisk();
            },
        }),
        {
            name: 'flashrevise-storage',
            // Omit fsConfig from localStorage persistence as it contains non-serializable data or transient state
            partialize: (state) => ({ goals: state.goals, currentView: state.currentView }),
        }
    )
);
