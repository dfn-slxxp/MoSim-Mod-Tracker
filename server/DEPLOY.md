# Deploying to DigitalOcean + subdomain

The server is stateless — it only serves the built React app. All data and auth
live in Firebase. Redeploys take under a minute and risk nothing.

This guide assumes:
- You have a DigitalOcean droplet running **Ubuntu 22.04 or 24.04**
- You have a domain (e.g. `yoursite.com`) with DNS you can edit
- You want the tracker at `mods.yoursite.com`
- You've already set up Firebase (see README Setup section)

---

## 1 — First-time droplet setup

SSH in:
```bash
ssh root@YOUR_DROPLET_IP
```

Install Node (via the official NodeSource repo — Ubuntu's built-in version is old):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs nginx certbot python3-certbot-nginx
```

Verify:
```bash
node --version   # should be v22.x
nginx -v
```

---

## 2 — Build locally (Windows)

On your Windows machine, in the repo root:

```powershell
cd web
npm run build
cd ..
```

This produces `web/dist/` — the static files to upload.

---

## 3 — Upload to the droplet

Still on Windows, from the repo root:

```powershell
# Create the folder on the droplet
ssh root@YOUR_DROPLET_IP "mkdir -p /opt/mosim-tracker"

# Upload the Express server + the built web app
scp -r server/* root@YOUR_DROPLET_IP:/opt/mosim-tracker/
scp -r web/dist  root@YOUR_DROPLET_IP:/opt/mosim-tracker/dist
```

**For future redeploys** (after you change something), you only need:
```powershell
cd web && npm run build && cd ..
scp -r web/dist root@YOUR_DROPLET_IP:/opt/mosim-tracker/dist
```

---

## 4 — Install server deps and test

Back on the droplet:

```bash
cd /opt/mosim-tracker
npm install --omit=dev

# Quick smoke test — should return the index.html
node server.js &
curl -s -o /dev/null -w "%{http_code}" http://localhost:8787
# expect: 200
kill %1
```

---

## 5 — Run as a systemd service

This keeps the server alive across reboots and auto-restarts on crashes:

```bash
cat > /etc/systemd/system/mosim-tracker.service << 'EOF'
[Unit]
Description=MoSim Mod Tracker
After=network.target

[Service]
WorkingDirectory=/opt/mosim-tracker
ExecStart=/usr/bin/node server.js
Environment=PORT=8787
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
EOF

# Give www-data read access to the files
chown -R www-data:www-data /opt/mosim-tracker

systemctl daemon-reload
systemctl enable mosim-tracker
systemctl start mosim-tracker
systemctl status mosim-tracker    # should say "active (running)"
```

---

## 6 — DNS: point the subdomain at the droplet

In your DNS provider's control panel (Cloudflare, Namecheap, DigitalOcean DNS, etc.):

Add an **A record**:
```
Type:  A
Name:  mods          (becomes mods.yoursite.com)
Value: YOUR_DROPLET_IP
TTL:   300 (or Auto)
```

Wait a few minutes for it to propagate. Check with:
```bash
nslookup mods.yoursite.com
# should return your droplet IP
```

---

## 7 — nginx reverse proxy

Create the site config:

```bash
cat > /etc/nginx/sites-available/mosim-tracker << 'EOF'
server {
    listen 80;
    server_name mods.yoursite.com;

    # All requests go to the Node server
    location / {
        proxy_pass         http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/mosim-tracker /etc/nginx/sites-enabled/
nginx -t          # must say "syntax is ok"
systemctl reload nginx
```

Test: `curl -I http://mods.yoursite.com` → should return `200 OK`.

---

## 8 — Free HTTPS with certbot

Google sign-in requires HTTPS on a real domain. certbot handles this automatically:

```bash
certbot --nginx -d mods.yoursite.com
```

It will ask for your email, agree to terms, then automatically edit the nginx
config and set up auto-renewal. When it finishes:

```bash
systemctl reload nginx
```

Test: open `https://mods.yoursite.com` in a browser — should load the app with
a valid certificate (padlock icon).

Auto-renewal runs via a systemd timer that was installed by certbot — no action needed.
Verify it: `systemctl status certbot.timer`

---

## 9 — Authorize the domain in Firebase

Google sign-in will reject the popup unless you whitelist the domain:

1. Firebase console → **Authentication → Settings → Authorized domains**
2. Click **Add domain**
3. Enter `mods.yoursite.com`
4. Save

Now try signing in at `https://mods.yoursite.com` — the Google popup should open
and complete successfully.

---

## Redeploying after changes

```powershell
# On Windows, from repo root:
cd web
npm run build
cd ..
scp -r web/dist root@YOUR_DROPLET_IP:/opt/mosim-tracker/dist
```

The service keeps running the whole time (serving the old files). The new files
are live the moment scp finishes — no restart needed because nginx/Node serve
static files directly from disk on each request.

If you changed `server/server.js`:
```powershell
scp server/server.js root@YOUR_DROPLET_IP:/opt/mosim-tracker/server.js
ssh root@YOUR_DROPLET_IP "systemctl restart mosim-tracker"
```

---

## Troubleshooting

**503 Bad Gateway** — the Node service isn't running:
```bash
systemctl status mosim-tracker
journalctl -u mosim-tracker -n 50
```

**Google sign-in says "redirect_uri_mismatch"** — domain not in Firebase's authorized list (Step 9).

**cert expired** — `certbot renew --dry-run` to test renewal; if it fails, check that port 80 is open in your droplet's firewall.

**Files not updating after scp** — hard refresh in browser (Ctrl+Shift+R). The app has no service worker so there's no cache to clear on the server side.
