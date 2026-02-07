# Wojak 1% Holder Chat Server

Real-time Socket.io server for the gated chat room accessible only to holders of ≥42 Wojak Farmers Plot NFTs.

## Features

- **Gated Access**: Only users with verified 42+ NFTs can connect
- **End-to-End Encryption**: Messages encrypted with AES (client-side)
- **Ephemeral Messages**: Auto-delete after 7 days (MongoDB TTL)
- **Admin Tools**: Pin messages, mute users, post announcements
- **Typing Indicators**: Real-time typing status
- **Online Users**: See who's in the chat

## Deployment

### Railway (Recommended)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repo
3. Set the root directory to `socket-server`
4. Add environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `CHAT_JWT_SECRET`: Same secret used in Cloudflare Pages
   - `ALLOWED_ORIGINS`: `https://wojak.ink`

### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repo
3. Set build command: `cd socket-server && npm install && npm run build`
4. Set start command: `cd socket-server && npm start`
5. Add environment variables (same as Railway)

### Cloudflare Proxy

After deploying, set up Cloudflare to proxy WebSocket traffic:

1. Add a DNS record: `chat.wojak.ink` → Your Railway/Render URL
2. Enable Cloudflare proxy (orange cloud)
3. In Cloudflare Dashboard → Network, ensure "WebSockets" is enabled

Your Socket.io URL will be: `wss://chat.wojak.ink`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (Atlas free tier works) |
| `CHAT_JWT_SECRET` | JWT signing secret (must match Cloudflare Pages) |
| `PORT` | Server port (auto-set by Railway/Render) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) |

## Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
# ...

# Start development server
npm run dev
```

## MongoDB Setup

1. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
2. Create a database user
3. Whitelist all IPs (0.0.0.0/0) for Railway/Render
4. Copy the connection string to `MONGODB_URI`

The server will automatically create these collections with indexes:
- `messages` - Regular messages (7-day TTL)
- `pinnedmessages` - Persistent admin-pinned messages
- `mutedusers` - Muted user records (auto-expire)

## Security Notes

- JWT tokens issued by `/api/chat/token` expire in 5 minutes
- Server verifies NFT ownership before issuing tokens (never trust client)
- Messages are encrypted client-side before transmission
- No message content is logged on the server
