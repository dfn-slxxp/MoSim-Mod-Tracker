# Server Setup Guide

This walks through deploying the MoSim Mod Tracker server to a DigitalOcean droplet from scratch. The result is a server running at `https://yourdomain.com` with a valid HTTPS certificate, nginx reverse proxy, and a systemd service that restarts itself on crashes and reboots.

---

## What you need before starting

- **A domain name** you control (e.g. `mods.yoursite.com`). Any registrar works — Namecheap, Cloudflare, Google Domains, etc.
- **A DigitalOcean account** — [digitalocean.com](https://digitalocean.com). A $6/month Basic droplet (1 vCPU, 1 GB RAM) is plenty.
- **A Google account** for creating the OAuth application.
- **The repo** — either pushed to GitHub, or you'll upload it manually.

---

## Step 1 — Create a DigitalOcean droplet

1. Log into DigitalOcean → **Create → Droplets**
2. Choose **Ubuntu 22.04 LTS** (or 24.04) as the image
3. Size: **Basic / Regular SSD / 1 GB / 1 vCPU** ($6/month) is enough
4. Choose any datacenter region close to your users
5. Authentication: **SSH Key** (paste your public key) — much safer than a password
6. Click **Create Droplet** and wait ~30 seconds

Note the droplet's **IP address** from the dashboard.

---

## Step 2 — Point DNS at the droplet

In your domain registrar's DNS settings, add an **A record**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `mods` | `YOUR_DROPLET_IP` | 300 |

This makes `mods.yoursite.com` resolve to your droplet. DNS propagation can take a few minutes — check with `ping mods.yoursite.com` before continuing.

---

## Step 3 — Create Google OAuth credentials

The app uses Google sign-in. You need a Client ID and Client Secret from Google Cloud Console.

### 3a. Create a project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project selector at the top → **New Project**
3. Give it a name like "MoSim Mod Tracker" → **Create**
4. Make sure the new project is selected in the dropdown

### 3b. Configure the OAuth consent screen

1. In the left sidebar → **APIs & Services → OAuth consent screen**
2. User type: **External** (unless you have a Google Workspace org) → **Create**
3. Fill in the form:
   - **App name**: MoSim Mod Tracker
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue** through the Scopes page (no extra scopes needed — openid/email/profile are requested at login time)
5. On the Test users page: **Add Users** → add your Google email address. While the app is in *Testing* status only listed emails can sign in. You can add other users here, or publish the app later to allow anyone.
6. Click **Save and Continue → Back to Dashboard**

### 3c. Create OAuth 2.0 credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Name: "MoSim Mod Tracker Server"
4. Under **Authorized redirect URIs** → **Add URI**:
   ```
   https://mods.yoursite.com/api/auth/callback
   ```
   (Use your actual domain. You can also add `http://localhost:8787/api/auth/callback` for local dev.)
5. Click **Create**
6. A popup shows your **Client ID** and **Client Secret** — copy both now (you can retrieve them again from the Credentials page later)

---

## Step 4 — Edit manage.sh

Open `server/manage.sh` in your editor and fill in the variables at the top:

```bash
REPO_URL="https://github.com/YOUR_USERNAME/mosim-mod-tracker.git"
DOMAIN="mods.yoursite.com"          # must match your DNS record
GOOGLE_CLIENT_ID="1234567890-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxx"
```

If your repo is **private**, use a personal access token in the URL:
```bash
REPO_URL="https://YOUR_TOKEN@github.com/YOUR_USERNAME/mosim-mod-tracker.git"
```
Generate a token at GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** with `repo` scope.

Commit and push this file (the secrets are read from the file but never committed — `server/.env` is in `.gitignore`).

---

## Step 5 — Run the setup script

SSH into the droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Download the script directly:
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/mosim-mod-tracker/main/server/manage.sh -o manage.sh
```

Or clone the repo first and use it from there:
```bash
git clone https://github.com/YOUR_USERNAME/mosim-mod-tracker.git /tmp/mosim
```

Edit the variables at the top of the script, then run:
```bash
sudo bash manage.sh setup
```

The script will:
1. Install Node.js 22, nginx, certbot, git
2. Clone the repo to `/opt/mosim-tracker`
3. Write `server/.env` with your credentials and a fresh random JWT secret
4. Install npm dependencies and build the React frontend
5. Create and start a systemd service (`mosim-tracker`)
6. Configure nginx and obtain a Let's Encrypt HTTPS certificate (certbot will ask for your email)

The whole process takes 3–5 minutes. At the end you'll see:

```
▶ Setup complete!
  App:     https://mods.yoursite.com
  Service: systemctl status mosim-tracker
  Logs:    bash manage.sh logs
```

---

## Step 6 — Add the callback URI to Google (critical)

After setup, Google sign-in will fail with `redirect_uri_mismatch` until you do this step.

1. Go back to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, verify this exact URI is listed:
   ```
   https://mods.yoursite.com/api/auth/callback
   ```
   If it isn't, add it now → **Save**

> **Note:** Google can take a few minutes to propagate credential changes. If sign-in still fails immediately after saving, wait 2 minutes and try again.

---

## Step 7 — Verify the deployment

Open a browser and go to `https://mods.yoursite.com`. You should see:
- A padlock (HTTPS working)
- The MoSim Mod Tracker login page

Click **Sign in with Google**. If you get redirected to Google, can authenticate, and land back on the app — everything is working.

If something's wrong:
```bash
# On the droplet:
sudo bash manage.sh logs       # live service logs
sudo bash manage.sh status     # service health
nginx -t                       # check nginx config
journalctl -u mosim-tracker -n 50  # last 50 log lines
```

---

## Ongoing maintenance

### Updating the server after a code change

```bash
# Push code to GitHub first, then on the droplet:
sudo bash manage.sh deploy
```

This pulls the latest code, reinstalls dependencies, rebuilds the frontend, and restarts the service — with zero downtime (the old process serves until the new one is ready).

### Viewing logs

```bash
sudo bash manage.sh logs        # tail live (Ctrl-C to exit)
journalctl -u mosim-tracker -n 100   # last 100 lines
```

### Restarting without rebuilding

```bash
sudo bash manage.sh restart
```

### Service management

```bash
systemctl status mosim-tracker
systemctl stop   mosim-tracker
systemctl start  mosim-tracker
```

---

## Backing up the database

All user data is stored in a single SQLite file at `/opt/mosim-tracker/server/data.db`. Back it up like any file:

```bash
# Manual backup
cp /opt/mosim-tracker/server/data.db ~/backups/data-$(date +%Y%m%d).db

# Automated daily backup with cron (add via `crontab -e`):
0 3 * * * cp /opt/mosim-tracker/server/data.db /root/backups/data-$(date +\%Y\%m\%d).db
```

To restore: stop the service, replace the file, restart.

```bash
systemctl stop mosim-tracker
cp ~/backups/data-20260101.db /opt/mosim-tracker/server/data.db
systemctl start mosim-tracker
```

---

## Renewing the HTTPS certificate

Let's Encrypt certificates expire after 90 days. The certbot package installs a systemd timer that renews automatically. Verify it's active:

```bash
systemctl status certbot.timer
```

To force a manual renewal:
```bash
certbot renew --nginx
systemctl reload nginx
```

---

## Adding more users

While the OAuth consent screen is in **Testing** status, only listed test users can sign in.

**Option A — Add individual test users (recommended for private use):**
1. Google Cloud Console → APIs & Services → OAuth consent screen → **Test users**
2. Add Google email addresses

**Option B — Publish the app (anyone can sign in):**
1. OAuth consent screen → **Publish App → Confirm**
2. Note: If the app is not verified by Google, users will see a warning screen. For a private tool used only by people you know, this is fine — they just click "Advanced → Go to app".

---

## Environment variables reference

The file at `/opt/mosim-tracker/server/.env` is never committed to git. Its contents:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `OAUTH_REDIRECT_URI` | Must exactly match the URI registered in Google Console |
| `JWT_SECRET` | Random 32-byte hex string; signs session tokens. Never change this after users have signed in — it invalidates all sessions. |
| `NODE_ENV` | `production` (enables secure cookies) |
| `PORT` | Port the Node server listens on (default 8787) |
