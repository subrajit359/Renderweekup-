# Renderweekup

A lightweight background pinger that keeps your Render.com (or any) service alive by sending a GET request every 10 minutes.

## Features

- Pings your service every 10 minutes automatically
- Dashboard showing uptime %, response times, and full ping history (last 50)
- Response time chart
- "Ping Now" button for on-demand pings
- No build step — pure Node.js

## Setup

```bash
npm install
npm start
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port to run the server on |
| `TARGET_URL` | `https://crt-4-1.onrender.com/api/health` | URL to ping every 10 minutes |

## Deploy to Render

1. Push this folder to a GitHub repo
2. Create a new **Web Service** on Render
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add environment variable `TARGET_URL` pointing to your service

## Deploy to Railway

1. Push to GitHub
2. Create new project → Deploy from GitHub
3. Set `TARGET_URL` in environment variables

## Deploy to Fly.io

```bash
fly launch
fly deploy
```
