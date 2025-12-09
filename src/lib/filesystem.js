import { get, set } from 'idb-keyval';

// Key for storing the directory handle in IndexedDB
const DIR_HANDLE_KEY = 'flashrevise_dir_handle';

/**
 * Prompt user to select a directory for storage.
 */
export async function selectDirectory() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        await set(DIR_HANDLE_KEY, dirHandle);
        return dirHandle;
    } catch (err) {
        if (err.name === 'AbortError') {
            return null; // User cancelled
        }
        throw err;
    }
}

/**
 * Get the stored directory handle.
 * Note: Browser requires user activation verification upon reload.
 */
export async function getDirectoryHandle() {
    return await get(DIR_HANDLE_KEY);
}

/**
 * Verify permission for the handle.
 */
export async function verifyPermission(fileHandle, readWrite = true) {
    const options = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    // Check if permission was already granted. If so, return true.
    if ((await fileHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    // Request permission. If the user grants permission, return true.
    if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    // The user didn't grant permission, so return false.
    return false;
}

/**
 * Sanitize filename.
 */
function sanitize(str) {
    return str.replace(/[^a-z0-9_\-\s]/gi, '').trim() || 'Untitled';
}

/**
 * Recursively save data to the file system.
 */
export async function saveToLocalDir(dirHandle, goals) {
    // 1. Save top-level data
    const appDataFile = await dirHandle.getFileHandle('app_data.json', { create: true });
    const writable = await appDataFile.createWritable();
    await writable.write(JSON.stringify(goals, null, 2));
    await writable.close();

    // 2. Iterate and create folders
    for (const goal of goals) {
        const goalDir = await dirHandle.getDirectoryHandle(sanitize(goal.title), { create: true });

        for (const subject of goal.subjects) {
            const subjectDir = await goalDir.getDirectoryHandle(sanitize(subject.title), { create: true });

            for (const topic of subject.topics) {
                const topicDir = await subjectDir.getDirectoryHandle(sanitize(topic.title), { create: true });

                for (const subtopic of topic.subtopics) {
                    const subtopicDir = await topicDir.getDirectoryHandle(sanitize(subtopic.title), { create: true });

                    // Save flashcards
                    const flashcardsFile = await subtopicDir.getFileHandle('flashcards.json', { create: true });
                    const cardWritable = await flashcardsFile.createWritable();
                    await cardWritable.write(JSON.stringify(subtopic.flashcards, null, 2));
                    await cardWritable.close();
                }
            }
        }
    }
}
