# Yuktitec website (Node.js)

Express server that serves the site in `public/` and handles the contact form at `POST /api/contact`.

## Run locally
```
npm install
cp .env.example .env     # fill in SMTP_* to enable the contact-form email
npm start                # http://localhost:3000
```
Without SMTP settings the site still works: the form falls back to copying the message so the visitor can email it.

## Deploy on GoDaddy
**cPanel hosting with "Setup Node.js App"** (Linux Deluxe/Ultimate or higher):
1. Upload everything except `node_modules` and `.env` to a folder such as `~/yuktitec`.
2. cPanel > Setup Node.js App > Create Application: Node 18+, mode Production, application root `yuktitec`, application URL your domain, startup file `server.js`.
3. Add the environment variables from `.env.example` there (or upload a `.env`), then click "Run NPM Install" and "Restart".

**GoDaddy VPS:** install Node 18+, `npm install --omit=dev`, run with `pm2 start server.js`, and put nginx in front on ports 80/443 with a Let's Encrypt certificate.

Basic shared hosting without Node support can't run this app; use the static `public/index.html` there instead (the form then falls back to copy-to-clipboard).

## Endpoints
- `GET /` the site, `GET /healthz` health check
- `POST /api/contact` `{name, message, topics[]}` (rate-limited, honeypot-protected)
