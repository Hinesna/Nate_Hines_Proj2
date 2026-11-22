# Card Collection App

Simple multi-user card library: Express 5 API (Netlify Function via serverless-http) + Mongoose + MongoDB Atlas, with a plain HTML/JS frontend in `front_end/`. See `planOutline.md` for the design.

## Setup

```
npm install express mongoose serverless-http
```

This installs the latest versions and writes them into `package.json`. Record the installed versions here after installing:

- express: ?
- mongoose: ?
- serverless-http: ?

Create `.env` (git-ignored) containing:

```
MONGODB_URI=<your Atlas connection string>
```

## Run locally

```
npm run dev
```

Open the URL Netlify prints (normally http://localhost:8888). Check `http://localhost:8888/api/health` first.

## Deploy

1. Push to GitHub (confirm `.env` is not tracked).
2. In the Netlify Dashboard, create a site from the repo. `netlify.toml` already sets the publish directory, functions directory and `/api/*` redirect; no build command is needed.
3. Add `MONGODB_URI` under Site configuration > Environment variables (scope: Functions).
4. In Atlas > Network Access, allow Netlify's IPs (`0.0.0.0/0`).
