/*
 * Google Drive Service for FlashRevise
 * Handles authentication and file operations using Google Identity Services and Drive API.
 */

// CLIENT ID - User must replace this!
const CLIENT_ID = '468031847286-cst254eie2ibs0su4una3u4bmauppavk.apps.googleusercontent.com'; // <--- REPLACE THIS
const API_KEY = ''; // Optional if using access token directly, but good for some discovery calls.
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; // Only access files created by this app

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Initialize GAPI (for API requests)
export async function loadGapi() {
    if (typeof gapi === 'undefined') {
        throw new Error("Google API script not loaded");
    }
    return new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    // apiKey: API_KEY, // Optional
                    discoveryDocs: [DISCOVERY_DOC],
                });
                gapiInited = true;
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

// Initialize GIS (for Authentication)
export function loadGis(onTokenCallback) {
    if (typeof google === 'undefined') {
        throw new Error("Google Identity script not loaded");
    }
    return new Promise((resolve) => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error("Token Error:", tokenResponse);
                    return;
                }
                if (onTokenCallback) onTokenCallback(tokenResponse);
            },
        });
        gisInited = true;
        resolve();
    });
}

// Trigger Sign In
export function handleAuthClick() {
    if (!tokenClient) return;
    // Request an access token
    tokenClient.requestAccessToken();
}

// Sign Out (Revoke token)
export function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            console.log("Token revoked");
        });
    }
}

/**
 * Save content to a specific file on Google Drive.
 * If file exists (by name), update it. Otherwise create it.
 */
export async function saveToDrive(filename, content) {
    if (!gapiInited) throw new Error("GAPI not initialized");

    // 1. Check if file exists
    const fileId = await findFile(filename);

    const fileMetadata = {
        name: filename,
        mimeType: 'application/json',
    };

    const media = {
        mimeType: 'application/json',
        body: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    };

    if (fileId) {
        // Update existing file
        return gapi.client.drive.files.update({
            fileId: fileId,
            resource: fileMetadata,
            media: media,
            uploadType: 'multipart', // Simple upload doesn't support metadata update + content well in v3 gapi client helper usually? 
            // Actually GAPI client handles this if we construction body right? 
            // Simplified approach: just update content via upload API or specific update call.
            // Standard GAPI client is a bit tricky with multipart. 
            // Let's use a simpler fetch for upload if GAPI is complex, OR use the standard update method but we need to be careful about body.
        }).then(() => console.log("File updated"));
        // Wait, gapi.client.drive.files.update usually expects the body in request body for metadata, and content in media?
        // Actually, for GAPI JS client:
        return updateFileContent(fileId, JSON.stringify(content, null, 2));

    } else {
        // Create new file
        // We'll use the multipart upload helper pattern or just create empty then update.
        // Easiest reliable way with GAPI client is creating metadata then content, or using a multipart boundary helper.
        // Let's use a robust "createFile" helper.
        return createFile(filename, JSON.stringify(content, null, 2));
    }
}

/**
 * Helper: Find file by name in root (app data folder logic not strictly enforced here to keep it simple, 
 * but scope=drive.file ensures we only see our own files mostly).
 */
async function findFile(filename) {
    const response = await gapi.client.drive.files.list({
        q: `name = '${filename}' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
        return files[0].id;
    }
    return null;
}

/**
 * Helper: Create file with content
 * NOTE: GAPI client doesn't support multipart upload natively easily for body content.
 * We often have to use raw fetch with token for uploads.
 */
async function createFile(filename, content) {
    const token = gapi.client.getToken().access_token;
    const metadata = {
        name: filename,
        mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + token }),
        body: form
    });
    return response.json();
}

/**
 * Helper: Update file content
 */
async function updateFileContent(fileId, content) {
    const token = gapi.client.getToken().access_token;
    const metadata = {
        mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: new Headers({ 'Authorization': 'Bearer ' + token }),
        body: form
    });
    return response.json();
}

/**
 * Load content from Drive
 */
export async function loadFromDrive(filename) {
    if (!gapiInited) throw new Error("GAPI not initialized");
    const fileId = await findFile(filename);
    if (!fileId) return null;

    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });
    // GAPI returns body in 'body' or 'result' depending on version/config
    return response.body || response.result;
}
