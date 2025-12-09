
export const GITHUB_API_BASE = 'https://api.github.com';

// --- Basic File Operations ---

export async function fetchRepoData(token, owner, repo, path = 'saved-flashcards/app_data.json') {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            if (response.status === 404) return null; // File doesn't exist yet
            throw new Error(`GitHub API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = decodeURIComponent(escape(atob(data.content))); // Handle UTF-8 correctly
        return {
            content: JSON.parse(content),
            sha: data.sha
        };
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        throw error;
    }
}

// --- Git Database API (Low Level) ---

async function getRef(token, owner, repo, ref = 'heads/main') {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/${ref}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Error getting ref: ${response.statusText}`);
    return response.json();
}

async function createBlob(token, owner, repo, content) {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
            encoding: 'base64'
        })
    });
    if (!response.ok) throw new Error(`Error creating blob: ${response.statusText}`);
    return response.json();
}

async function createTree(token, owner, repo, tree, base_tree_sha) {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tree,
            base_tree: base_tree_sha
        })
    });
    if (!response.ok) throw new Error(`Error creating tree: ${response.statusText}`);
    return response.json();
}

async function createCommit(token, owner, repo, message, tree, parents) {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            tree,
            parents
        })
    });
    if (!response.ok) throw new Error(`Error creating commit: ${response.statusText}`);
    return response.json();
}

async function updateRef(token, owner, repo, ref, sha) {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/${ref}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sha,
            force: true
        })
    });
    if (!response.ok) throw new Error(`Error updating ref: ${response.statusText}`);
    return response.json();
}

// --- Orchestration ---

export async function syncTree(token, owner, repo, goals) {
    try {
        // 1. Get current commit SHA
        const refData = await getRef(token, owner, repo);
        const latestCommitSha = refData.object.sha;

        // 2. Get the tree of the latest commit to use as base (optional, but good for merging)
        // Actually, we want to Replace the 'saved-flashcards' folder entirely or update it.
        // To keep it simple and robust: we will construct a tree that REPLACES the 'saved-flashcards' path.

        // Flatten the data into a list of file paths and contents
        const files = [];

        // Add the main app_data.json for fast loading
        files.push({
            path: 'saved-flashcards/app_data.json',
            content: JSON.stringify(goals, null, 2)
        });

        // Traverse and add individual files
        for (const goal of goals) {
            const goalPath = `saved-flashcards/${sanitize(goal.title)}`;

            for (const subject of goal.subjects) {
                const subjectPath = `${goalPath}/${sanitize(subject.title)}`;

                for (const topic of subject.topics) {
                    const topicPath = `${subjectPath}/${sanitize(topic.title)}`;

                    for (const subtopic of topic.subtopics) {
                        const subtopicPath = `${topicPath}/${sanitize(subtopic.title)}`;

                        // Save flashcards for this subtopic
                        files.push({
                            path: `${subtopicPath}/flashcards.json`,
                            content: JSON.stringify(subtopic.flashcards, null, 2)
                        });
                    }
                }
            }
        }

        // 3. Create Blobs for all files
        // Note: For very large numbers of files, this should be batched. 
        // For this MVP, we'll do `Promise.all` but be mindful of rate limits.
        const treeItems = await Promise.all(files.map(async (file) => {
            const blob = await createBlob(token, owner, repo, file.content);
            return {
                path: file.path,
                mode: '100644',
                type: 'blob',
                sha: blob.sha
            };
        }));

        // 4. Create Tree
        // We use the latest commit's tree as base so we don't delete other files in the repo (like index.html)
        const baseCommitResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const baseCommit = await baseCommitResponse.json();
        const baseTreeSha = baseCommit.tree.sha;

        const newTree = await createTree(token, owner, repo, treeItems, baseTreeSha);

        // 5. Create Commit
        const newCommit = await createCommit(token, owner, repo, 'Sync flashcards (Nested Structure)', newTree.sha, [latestCommitSha]);

        // 6. Update Ref (Push)
        await updateRef(token, owner, repo, 'heads/main', newCommit.sha);

        return newCommit.sha;

    } catch (error) {
        console.error('Error syncing tree:', error);
        throw error;
    }
}

function sanitize(str) {
    return str.replace(/[^a-z0-9_\-\s]/gi, '').trim() || 'Untitled';
}
