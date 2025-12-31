# LinkStream - Stremio Addon

Stream from a custom link set via web interface. Appears as a stream provider for all movies and shows in Stremio.

## How It Works

1. **Set a link** on the web interface from any device
2. **Select any movie** in Stremio
3. **Click "LinkStream"** → Plays your custom link

## Deployment

### Backend (Koyeb)
- Deploy root folder
- Build: `npm install`
- Run: `npm start`
- Port: `7000`

### Frontend (Vercel)
- Set root directory to `web`

## Local Development

```bash
npm install
npm start
# Open http://localhost:7000/manifest.json
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/manifest.json` | GET | Stremio addon manifest |
| `/link` | GET | Get current link |
| `/link` | POST | Set link `{"url": "..."}` |
| `/stream/:type/:id.json` | GET | Stream handler |
