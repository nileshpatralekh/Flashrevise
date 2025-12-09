
export const GITHUB_API_BASE = 'https://api.github.com';

export async function fetchRepoData(token, owner, repo, path = 'data.json') {
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

export async function saveRepoData(token, owner, repo, content, sha = null, path = 'data.json') {
    try {
        const body = {
            message: 'Sync flashcard data',
            content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))), // Handle UTF-8
            ...(sha && { sha })
        };

        const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content.sha;
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        throw error;
    }
}
