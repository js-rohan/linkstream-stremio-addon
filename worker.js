// LinkStream Stremio Addon - Cloudflare Worker Version
// Uses Cloudflare KV for persistent link storage

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Addon manifest
const manifest = {
    id: 'community.linkstream',
    version: '1.0.0',
    name: 'LinkStream',
    description: 'Stream from a custom link set via web interface',
    logo: 'https://img.icons8.com/fluency/240/link.png',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
    idPrefixes: ['tt', 'kitsu']
};

// Helper to create JSON response
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        }
    });
}

// Handle CORS preflight
function handleOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

// Get stored link from KV
async function getLink(env) {
    try {
        const url = await env.LINKSTREAM_KV.get('stream_url');
        return url || '';
    } catch (error) {
        console.error('Error getting link:', error);
        return '';
    }
}

// Save link to KV
async function saveLink(env, url) {
    try {
        await env.LINKSTREAM_KV.put('stream_url', url);
        return true;
    } catch (error) {
        console.error('Error saving link:', error);
        return false;
    }
}

// Route handler
async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return handleOptions();
    }

    // Manifest endpoint
    if (path === '/manifest.json') {
        return jsonResponse(manifest);
    }

    // Get link endpoint
    if (path === '/link' && method === 'GET') {
        const link = await getLink(env);
        return jsonResponse({ url: link });
    }

    // Set link endpoint
    if (path === '/link' && method === 'POST') {
        try {
            const body = await request.json();
            const streamUrl = body.url;

            if (typeof streamUrl !== 'string') {
                return jsonResponse({ error: 'URL must be a string' }, 400);
            }

            const saved = await saveLink(env, streamUrl);
            if (saved) {
                return jsonResponse({ success: true, url: streamUrl });
            } else {
                return jsonResponse({ error: 'Failed to save link' }, 500);
            }
        } catch (error) {
            return jsonResponse({ error: 'Invalid request body' }, 400);
        }
    }

    // Stream endpoint - /stream/:type/:id.json
    const streamMatch = path.match(/^\/stream\/(movie|series)\/([^/]+)\.json$/);
    if (streamMatch && method === 'GET') {
        const [, type, id] = streamMatch;
        console.log(`Stream request for ${type}: ${id}`);

        const link = await getLink(env);

        if (!link) {
            return jsonResponse({ streams: [] });
        }

        return jsonResponse({
            streams: [{
                name: 'LinkStream',
                title: '▶️ Play Custom Link',
                url: link,
                behaviorHints: {
                    notWebReady: false
                }
            }]
        });
    }

    // Health check
    if (path === '/health') {
        const link = await getLink(env);
        return jsonResponse({ status: 'ok', link: link ? 'set' : 'not set' });
    }

    // 404 for unknown routes
    return jsonResponse({ error: 'Not found' }, 404);
}

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env);
    }
};
