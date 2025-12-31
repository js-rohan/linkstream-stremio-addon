const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Link storage file path
const LINK_FILE = path.join(__dirname, 'link.json');

// Load saved link from file
function loadLink() {
    try {
        if (fs.existsSync(LINK_FILE)) {
            const data = JSON.parse(fs.readFileSync(LINK_FILE, 'utf8'));
            return data.url || '';
        }
    } catch (err) {
        console.error('Error loading link:', err);
    }
    return '';
}

// Save link to file
function saveLink(url) {
    try {
        fs.writeFileSync(LINK_FILE, JSON.stringify({ url }, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving link:', err);
        return false;
    }
}

// Current streaming link (loaded from file on startup)
let currentLink = loadLink();

// Addon manifest - describes what this addon does
const manifest = {
    id: 'community.linkstream',
    version: '1.0.0',
    name: 'LinkStream',
    description: 'Stream from a custom link set via web interface',
    logo: 'https://img.icons8.com/fluency/240/link.png',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
    idPrefixes: ['tt', 'kitsu'] // Support IMDB and Kitsu IDs - covers most content
};

// Create the addon
const builder = new addonBuilder(manifest);

// Stream handler - returns our custom link for any content
builder.defineStreamHandler(({ type, id }) => {
    console.log(`Stream request for ${type}: ${id}`);

    // Always return freshly loaded link (in case it was updated)
    const link = loadLink();

    if (!link) {
        return Promise.resolve({ streams: [] });
    }

    // Return the custom stream
    return Promise.resolve({
        streams: [{
            name: 'LinkStream',
            title: '▶️ Play Custom Link',
            url: link,
            behaviorHints: {
                notWebReady: false
            }
        }]
    });
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// API endpoint to get current link
app.get('/link', (req, res) => {
    res.json({ url: loadLink() });
});

// API endpoint to set new link
app.post('/link', (req, res) => {
    const { url } = req.body;

    if (typeof url !== 'string') {
        return res.status(400).json({ error: 'URL must be a string' });
    }

    currentLink = url;
    const saved = saveLink(url);

    if (saved) {
        console.log(`Link updated to: ${url}`);
        res.json({ success: true, url });
    } else {
        res.status(500).json({ error: 'Failed to save link' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', link: loadLink() ? 'set' : 'not set' });
});

// Mount the addon router (handles manifest.json and stream requests)
const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    LinkStream Addon                        ║
╠═══════════════════════════════════════════════════════════╣
║  Addon URL:     http://localhost:${PORT}/manifest.json        ║
║  Get Link:      GET  http://localhost:${PORT}/link            ║
║  Set Link:      POST http://localhost:${PORT}/link            ║
║  Health Check:  GET  http://localhost:${PORT}/health          ║
╚═══════════════════════════════════════════════════════════╝
    `);
    console.log(`Current link: ${loadLink() || '(not set)'}`);
});
