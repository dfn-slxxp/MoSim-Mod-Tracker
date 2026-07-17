# Deploying to DigitalOcean + subdomain

The server clones your repo directly and builds on the droplet.
No scp, no manual file transfers — updates are one command.

**Prerequisites:**
- Ubuntu 22.04 or 24.04 droplet
- A domain with DNS you can edit
- Firebase already configured (README → Setup)

---

## One-time: edit manage.sh

Before doing anything else, open `server/manage.sh` and set the two variables at the top:

```bash
REPO_URL="https://github.com/dfn-slxxp/mosim-mod-tracker.git"
DOMAIN="mods.yoursite.com"
```

**Private repo?** Use a GitHub Personal Access Token in the URL:
1. GitHub → Settings → Developer settings → Personal access tokens (classic) → New token
2. Tick **repo** scope → generate → copy it
3. Set `REPO_URL="https://YOUR_TOKEN@github.com/dfn-slxxp/mosim-mod-tracker.git"`

Commit and push this change before continuing.

---

## First-time setup (run once)

### 1 — DNS first

In your DNS provider, add an **A record**:
```
Type:  A
Name:  mods
Value: YOUR_DROPLET_IP
TTL:   300
```

Wait for it to propagate before running certbot (check: `nslookup mods.yoursite.com`).

### 2 — Run the setup script

SSH into your droplet and run:

```bash
ssh root@YOUR_DROPLET_IP

# Download and run the setup script directly from your repo
curl -fsSL https://raw.githubusercontent.com/dfn-slxxp/mosim-mod-tracker/main/server/manage.sh | bash -s setup
```

Or if you prefer to inspect it first:
```bash
curl -O https://raw.githubusercontent.com/dfn-slxxp/mosim-mod-tracker/main/server/manage.sh
bash manage.sh setup
```

The script will:
1. Install Node 22, nginx, certbot, git
2. Clone your repo to `/opt/mosim-tracker`
3. `npm install` in both `web/` and `server/`
4. `npm run build` to produce `web/dist/`
5. Create a systemd service (auto-starts on reboot)
6. Configure nginx as a reverse proxy
7. Run certbot to get a free HTTPS certificate (it'll ask for your email)

Total time: ~3–5 minutes.

### 3 — Authorize the domain in Firebase

After setup finishes, the script reminds you to do this — don't skip it or sign-in won't work:

Firebase console → **Authentication → Settings → Authorized domains → Add domain** → `mods.yoursite.com`

That's it. Your app is live at `https://mods.yoursite.com`.

---

## Deploying updates

Whenever you push changes to GitHub, update the server with one command:

```bash
ssh root@YOUR_DROPLET_IP "bash /opt/mosim-tracker/server/manage.sh deploy"
```

Or add an alias to your Windows PowerShell profile so it's even shorter:
```powershell
# Add to $PROFILE (run: notepad $PROFILE)
function Deploy-Tracker { ssh root@YOUR_DROPLET_IP "bash /opt/mosim-tracker/server/manage.sh deploy" }
```

Then just: `Deploy-Tracker`

The deploy command:
1. `git pull` — fetches your latest commit
2. `npm install` — picks up any new dependencies
3. `npm run build` — rebuilds the React app
4. `systemctl restart` — hot-swaps the service (zero downtime on the service itself; nginx keeps serving)

---

## Other commands

```bash
# All run on the droplet as root
bash /opt/mosim-tracker/server/manage.sh status   # is the service healthy?
bash /opt/mosim-tracker/server/manage.sh logs     # tail live logs (Ctrl-C to exit)
bash /opt/mosim-tracker/server/manage.sh restart  # restart without rebuilding
```

---

## Troubleshooting

**"repo already cloned" on setup** — setup detected the repo exists and ran deploy instead. Fine.

**Service fails to start** → `bash manage.sh logs` — the most common cause is the web/dist folder not existing yet (build failed). Re-run `bash manage.sh deploy`.

**Sign-in popup fails with `redirect_uri_mismatch`** — you skipped the Firebase authorized domains step above.

**Cert expired** → `certbot renew` — usually handled automatically by the certbot systemd timer, but you can force it.

**Want to check what's deployed** → `bash manage.sh status` shows service health and the size of `web/dist`.
