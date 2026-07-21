# Deploying to DigitalOcean + subdomain

The server clones your repo directly and builds on the droplet.
No scp, no manual file transfers — updates are one command.

**What you need:**
- Ubuntu 22.04 or 24.04 droplet
- A domain with DNS you can edit
- Google OAuth credentials (see step 1 below)

---

## Step 1 — Create Google OAuth credentials

This replaces Firebase. It's simpler: just a client ID and secret.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project.
3. **APIs & Services → OAuth consent screen** → External → fill in app name + your email.
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://mods.yoursite.com/api/auth/callback`
   - (Also add `http://localhost:8787/api/auth/callback` for local dev)
5. Copy the **Client ID** and **Client Secret**.

---

## Step 2 — Edit manage.sh

Open `server/manage.sh` and set the variables at the top:

```bash
REPO_URL="https://github.com/dfn-slxxp/mosim-mod-tracker.git"
DOMAIN="mods.yoursite.com"
GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-secret"
```

**Private repo?** Use a GitHub Personal Access Token in the URL:
1. GitHub → Settings → Developer settings → Personal access tokens (classic) → New token
2. Tick **repo** scope → generate → copy it
3. `REPO_URL="https://YOUR_TOKEN@github.com/dfn-slxxp/mosim-mod-tracker.git"`

Commit and push before continuing (the server will clone from this URL).

---

## Step 3 — DNS

Add an **A record** in your DNS provider:
```
Type:  A
Name:  mods
Value: YOUR_DROPLET_IP
TTL:   300
```

Wait for it to propagate before running certbot (`nslookup mods.yoursite.com` to check).

---

## Step 4 — Run the setup script

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP

# Download and run setup directly from your repo
curl -fsSL https://raw.githubusercontent.com/dfn-slxxp/mosim-mod-tracker/main/server/manage.sh | bash -s setup
```

Or inspect first:
```bash
curl -O https://raw.githubusercontent.com/dfn-slxxp/mosim-mod-tracker/main/server/manage.sh
bash manage.sh setup
```

The script will:
1. Install Node 22, nginx, certbot, git, openssl
2. Clone your repo to `/opt/mosim-tracker`
3. Generate a random `JWT_SECRET` and write `server/.env`
4. `npm install` in both `web/` and `server/`
5. `npm run build` to produce `web/dist/`
6. Create a systemd service (auto-starts on reboot)
7. Configure nginx as a reverse proxy
8. Run certbot (asks for your email) to get a free HTTPS cert

Total time: ~3–5 minutes.

---

## Step 5 — Add the callback URI

After setup finishes you'll see a reminder — don't skip this:

In **Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID**:

Add to **Authorized redirect URIs**:
```
https://mods.yoursite.com/api/auth/callback
```

Your app is now live at `https://mods.yoursite.com`. Sign in with Google.

---

## Optional — GitHub + Discord sign-in

Both are optional: when their credentials are missing from `server/.env`, the
buttons simply don't appear and Google keeps working alone.

**GitHub:** github.com → Settings → Developer settings → OAuth Apps → New OAuth
App. Callback URL: `https://mods.yoursite.com/api/auth/callback/github`.

**Discord:** discord.com/developers/applications → New Application → OAuth2 →
Add Redirect: `https://mods.yoursite.com/api/auth/callback/discord`.

Then append to `server/.env` on the droplet and restart the service:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

Scopes are requested at runtime (`read:user user:email` for GitHub,
`identify email` for Discord) — nothing to configure in the provider UIs.

---

## Optional — server-side TBA key

One The Blue Alliance read key (thebluealliance.com/account) serves every user;
nobody enters their own. Append to `server/.env` and restart:

```bash
TBA_AUTH_KEY=...
```

Without it, `/api/tba/team/:number` returns 404 and the add-robot form simply
skips the team-name preview.

---

## Deploying updates

Push your changes to GitHub, then:

```bash
ssh root@YOUR_DROPLET_IP "bash /opt/mosim-tracker/server/manage.sh deploy"
```

Or add a PowerShell alias:
```powershell
# Add to $PROFILE
function Deploy-Tracker { ssh root@YOUR_DROPLET_IP "bash /opt/mosim-tracker/server/manage.sh deploy" }
```

The deploy command: backup DB → `git pull` → `npm install` → `npm run build` → `systemctl restart`.
Your data lives OUTSIDE the repo at `/var/lib/mosim-tracker/data.db` and is
backed up to `/var/lib/mosim-tracker/backups/` (last 10 kept) before every deploy.

---

## Other commands

```bash
bash /opt/mosim-tracker/server/manage.sh status   # service health + disk usage
bash /opt/mosim-tracker/server/manage.sh logs     # tail live logs (Ctrl-C to exit)
bash /opt/mosim-tracker/server/manage.sh restart  # restart without rebuilding
```

---

## Local development

Run both the API server and the Vite dev server:

```bash
# Terminal 1 — API server (needs server/.env filled in first)
cd server
cp .env.example .env    # then fill in your Google OAuth creds
node server.js

# Terminal 2 — Vite dev server (proxies /api/* to localhost:8787)
cd web
npm run dev
```

Visit `http://localhost:5173`. Sign-in redirects go to Google and back.

For the desktop app:
```bash
python app/main.py   # loads http://localhost:8787 by default
```

---

## Troubleshooting

**`redirect_uri_mismatch`** — the callback URI in Google Cloud Console doesn't match. Add `https://mods.yoursite.com/api/auth/callback` exactly as shown above.

**Service fails to start** → `bash manage.sh logs` — most common: `server/.env` missing or malformed. Re-run deploy.

**Cert expired** → `certbot renew` (usually handled automatically by certbot's systemd timer).

**Lost data?** Your `data.db` lives at `/var/lib/mosim-tracker/data.db`, with
automatic pre-deploy backups in `/var/lib/mosim-tracker/backups/`. Pull a copy locally:
```bash
scp root@YOUR_DROPLET_IP:/var/lib/mosim-tracker/data.db ./backup-$(date +%Y%m%d).db
```
To restore a backup: stop the service, copy the backup over `data.db` (delete any
`data.db-wal`/`data.db-shm`), `chown www-data:www-data` it, start the service.
