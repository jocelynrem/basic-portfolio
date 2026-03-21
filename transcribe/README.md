# Transcribe

Scan handwritten notes, turn them into typed text, and save the result to Google Docs.

## What it needs

- Cloudflare Pages
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GEMINI_MODEL=gemini-flash-latest`
- Google Docs API enabled
- Google Drive API enabled

## Cloudflare setup

Deploy this repo from the repo root, not from the `transcribe` folder.

Use these Cloudflare Pages settings:

- Production branch: `main`
- Framework preset: `None`
- Build command: blank
- Build output directory: `.`
- Root directory: repo root

Add these environment variables in Cloudflare Pages:

- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GEMINI_MODEL=gemini-flash-latest`

The app lives at:

- `https://jocelynrem.com/transcribe/`

The backend routes are:

- `https://jocelynrem.com/transcribe/api/config`
- `https://jocelynrem.com/transcribe/api/transcribe`

## Google setup

In Google Cloud:

1. Enable `Google Docs API`
2. Enable `Google Drive API`
3. Create an OAuth `Web application` client
4. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `https://jocelynrem.com`
5. Use these scopes:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/drive.file`

Use these public URLs for verification:

- Home page: `https://jocelynrem.com/transcribe`
- Privacy policy: `https://jocelynrem.com/privacy.html`
- Terms: `https://jocelynrem.com/terms.html`

## Local testing

Run the Cloudflare dev server from the repo root:

```bash
cd /Users/jremington/Desktop/Coding/basic-portfolio
PATH="/usr/local/opt/node@20/bin:$PATH" npm_config_cache=/tmp/wrangler-cache npx wrangler pages dev . --port 3000
```

Then open:

- `http://localhost:3000/transcribe/`

## Troubleshooting

- If `/transcribe/api/config` returns 404, the site is not being served by Cloudflare Pages correctly.
- If transcription fails, check `GEMINI_API_KEY` and `GEMINI_MODEL`.
- If Google sign-in fails, check the OAuth client origins and test-user settings.
- If Docs saving fails, make sure the Docs and Drive APIs are enabled.
