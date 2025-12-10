import { get, set } from 'idb-keyval';

// Key for storing the directory handle in IndexedDB
const DIR_HANDLE_KEY = 'flashrevise_dir_handle';

export const isFileSystemSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

/**
 * Prompt user to select a directory for storage.
 */
export async function selectDirectory() {
    if (!isFileSystemSupported) {
        alert("Your device does not support direct folder access. Using internal storage.");
        return null;
    }
    try {
        const dirHandle = await window.showDirectoryPicker();
        try {
            await set(DIR_HANDLE_KEY, dirHandle);
        } catch (idbErr) {
            console.warn("IDB Save Failed (ignoring):", idbErr);
            alert("Warning: Could not save handle to database. App will work for this session only.");
        }
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

/**
 * Delete a file or folder physically.
 * @param {FileSystemDirectoryHandle} dirHandle 
 * @param {string[]} pathArray - Path to the item (e.g. ["Goal", "Subject"])
 */
export async function deleteItem(dirHandle, pathArray) {
    let currentHandle = dirHandle;
    // Iterate up to the parent of the item to delete
    for (let i = 0; i < pathArray.length - 1; i++) {
        try {
            currentHandle = await currentHandle.getDirectoryHandle(sanitize(pathArray[i]));
        } catch (e) {
            console.warn(`Path not found: ${pathArray[i]}`);
            return; // Path doesn't exist, nothing to delete
        }
    }

    // Now delete the final item from the parent handle
    const targetName = sanitize(pathArray[pathArray.length - 1]);
    try {
        await currentHandle.removeEntry(targetName, { recursive: true });
    } catch (e) {
        console.error(`Failed to delete ${targetName}`, e);
        // It might not exist, which is fine
    }
}

/**
 * Diagnostic tool to check file system capabilities.
 */
export async function diagnoseFileSystem(dirHandle) {
    const logs = [];
    const log = (msg) => logs.push(msg);

    log("Starting diagnostics...");

    if (!dirHandle) {
        log("ERROR: No handle provided.");
        return logs;
    }

    try {
        log(`Handle name: ${dirHandle.name}`);

        // 1. Check Permission
        const perm = await verifyPermission(dirHandle, true);
        log(`Permission Status: ${perm ? 'Granted' : 'Denied'}`);
        if (!perm) return logs;

        // 2. Try Write
        const testFileName = `test_write_${Date.now()}.txt`;
        log(`Attempting to write file: ${testFileName}`);
        const fileHandle = await dirHandle.getFileHandle(testFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write("Diagnostic test content");
        await writable.close();
        log("Write operation completed.");

        // 3. Try Read
        const file = await fileHandle.getFile();
        const content = await file.text();
        log(`Read back content: "${content}"`);
        if (content === "Diagnostic test content") {
            log("Read verification: PASSED");
        } else {
            log("Read verification: FAILED");
        }

        // 4. Try Delete
        log("Attempting delete...");
        await dirHandle.removeEntry(testFileName);
        log("Delete operation completed.");

        log("DIAGNOSTICS FINISHED: SUCCESS");

    } catch (err) {
        log(`FATAL ERROR: ${err.message}`);
        console.error(err);
    }
    return logs;
}

/**
 * Physically create a folder.
 * @param {FileSystemDirectoryHandle} dirHandle 
 * @param {string[]} names - Array of folder names forming the path
 */
export async function createItem(dirHandle, names) {
    let currentHandle = dirHandle;

    // Navigate and create folders along the path
    for (const name of names) {
        try {
            currentHandle = await currentHandle.getDirectoryHandle(sanitize(name), { create: true });
        } catch (err) {
            console.warn(`Could not create folder: ${name}`, err);
            throw err;
        }
    }
    return currentHandle;
}

/**
 * Save a file to a specific path.
 */
export async function saveFile(dirHandle, names, filename, content) {
    try {
        const folderHandle = await createItem(dirHandle, names);
        const fileHandle = await folderHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    } catch (err) {
        console.error(`Failed to save file ${filename}`, err);
        throw err;
    }
}
