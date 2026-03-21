# NoteFlow OCR

Scan handwritten notes in the browser, transcribe them with Gemini, and save the cleaned text into a Google Doc owned by the signed-in user.

## How it works

- The browser uploads a note image to a Cloudflare Pages Function.
- Cloudflare reads `GEMINI_API_KEY` from your Pages environment variables and sends the image to Gemini.
- The browser receives the transcription and lets the user edit it.
- The user signs into Google with their own account.
- The browser creates a Google Doc in that user's Drive and inserts the transcribed text.

## Project files

- [index.html](/Users/jremington/Desktop/Coding/basic-portfolio/transcribe/index.html): app markup
- [styles.css](/Users/jremington/Desktop/Coding/basic-portfolio/transcribe/styles.css): app styling
- [app.js](/Users/jremington/Desktop/Coding/basic-portfolio/transcribe/app.js): browser logic
- [config.js](/Users/jremington/Desktop/Coding/basic-portfolio/functions/transcribe/api/config.js): Google client ID endpoint for `/transcribe/api/config`
- [transcribe.js](/Users/jremington/Desktop/Coding/basic-portfolio/functions/transcribe/api/transcribe.js): Gemini transcription endpoint for `/transcribe/api/transcribe`
- [manifest.webmanifest](/Users/jremington/Desktop/Coding/basic-portfolio/transcribe/manifest.webmanifest): PWA manifest
- [sw.js](/Users/jremington/Desktop/Coding/basic-portfolio/transcribe/sw.js): service worker
- [.dev.vars.example](/Users/jremington/Desktop/Coding/basic-portfolio/transcribe/.dev.vars.example): local development variables for `wrangler pages dev`

## Requirements

- A Gemini API key
- A Google Cloud project
- A Google OAuth 2.0 Web application client ID

## 1. Add Cloudflare environment variables

In Cloudflare Pages for this project, add these environment variables:

- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GEMINI_MODEL`

Recommended value for `GEMINI_MODEL`:

```env
GEMINI_MODEL=gemini-flash-latest
```

Notes:
- `GEMINI_API_KEY` stays in Cloudflare and is never exposed to browsers.
- `GOOGLE_CLIENT_ID` is safe to expose to the browser. It identifies your app for Google sign-in.

## 2. Local development with Cloudflare

For local testing with `wrangler pages dev`, create `.dev.vars` from [.dev.vars.example](/Users/jremington/Desktop/Coding/basic-portfolio/transcribe/.dev.vars.example).

## 3. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Open the API key page.
3. Create a key for your project.
4. Add it to your Cloudflare Pages environment variables as `GEMINI_API_KEY`.

## 4. Set up Google Cloud for Docs sign-in

### Enable APIs

In your Google Cloud project, enable:

- Google Docs API
- Google Drive API

### Configure the OAuth consent screen

1. Open Google Cloud Console.
2. Go to `APIs & Services` > `OAuth consent screen`.
3. Choose `External` if multiple people outside your organization will use it.
4. Fill in the app name, support email, and developer contact info.
5. Add scopes as needed. The app requests:
   - `.../auth/documents`
   - `.../auth/drive.file`
   - `openid`
   - `email`
   - `profile`
6. If the app is still in testing mode, add your test users.

### Create the OAuth client

1. Go to `APIs & Services` > `Credentials`.
2. Click `Create Credentials`.
3. Choose `OAuth client ID`.
4. Choose `Web application`.
5. Add allowed JavaScript origins for every place you will run the app.

Examples:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- Your deployed HTTPS origin later, such as `https://your-domain.com`

6. Copy the generated client ID into your Cloudflare Pages environment variables as `GOOGLE_CLIENT_ID`.

Important:
- The origin must match exactly, including protocol and port.
- For production, serve the app over HTTPS.

## 5. Deploy on Cloudflare Pages

In Cloudflare Pages:

1. Create a new Pages project.
2. Point it at this repo.
3. Keep the project root as the repo root so the portfolio and `/transcribe` route deploy together.
4. Build command:

```text
(leave blank)
```

5. Build output directory:

```text
.
```

6. Add the environment variables:
   - `GEMINI_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GEMINI_MODEL`
7. Deploy.

The app will then live at:

```text
https://jocelynrem.com/transcribe/
```

Its API routes will live at:

```text
https://jocelynrem.com/transcribe/api/config
https://jocelynrem.com/transcribe/api/transcribe
```

## 6. Use the app

1. Open the app in your browser.
2. Upload or photograph a handwritten note.
3. Click `Transcribe handwriting`.
4. Review or edit the text.
5. Click `Sign in with Google`.
6. Click `Save to Google Docs`.
7. Open the created Doc from the link shown in the app.

## Multi-user behavior

- All users share the same Cloudflare-side Gemini key.
- Each user signs into their own Google account.
- Each created Doc is saved into the currently signed-in user's Drive.
- No user's Google token is stored in Cloudflare.

## Troubleshooting

### `Google sign-in is not ready yet for this app`

Add `GOOGLE_CLIENT_ID` to your Cloudflare Pages environment variables and redeploy.

### `Transcription failed`

Check:

- `GEMINI_API_KEY` is valid
- The image is clear and readable
- `GEMINI_MODEL` is set to `gemini-flash-latest`
- The Pages deployment includes your latest environment variables

### `Google sign-in was cancelled or failed`

Check:

- The OAuth consent screen is configured
- Your account is listed as a test user if the app is still in testing
- Your current origin is added to allowed JavaScript origins
- `https://jocelynrem.com` is added as an allowed JavaScript origin for production

### `Google Doc creation failed`

Check:

- Google Docs API is enabled
- Google Drive API is enabled
- The user granted permissions during sign-in
- The access token has not expired

## Production notes

- This app now uses Cloudflare Pages Functions for `/api/config` and `/api/transcribe`.
- If you deploy it publicly, add request limits and abuse protection around `/api/transcribe`.
- Store secrets only in Cloudflare environment variables, not in committed files.
- Small documentation-only commits can be used to trigger a fresh deployment when needed.
