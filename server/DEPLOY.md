# Deploying to your DigitalOcean droplet (subdomain of your site)

The server is stateless — it just serves the built web app. All data + auth stay in
Firebase, so you can nuke and redeploy this box any time without losing anything.

Say your subdomain is `mods.yoursite.com` and your droplet already runs nginx.

## 1. Build locally (Windows)

```powershell
cd web
npm run build
```

## 2. Upload to the droplet

```powershell
# from the repo root — copies the server + the built app
scp -r server root@YOUR_DROPLET_IP:/opt/mosim-tracker
scp -r web/dist root@YOUR_DROPLET_IP:/opt/mosim-tracker/dist
```

(Re-deploys later only need the second command.)

## 3. Run it as a service (on the droplet)

```bash
cd /opt/mosim-tracker && npm install --omit=dev

# systemd unit so it survives reboots
cat >/etc/systemd/system/mosim-tracker.service <<'EOF'
[Unit]
Description=MoSim Mod Tracker
After=network.target

[Service]
WorkingDirectory=/opt/mosim-tracker
ExecStart=/usr/bin/node server.js
Environment=PORT=8787
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now mosim-tracker
curl -I http://localhost:8787   # should say 200
```

## 4. Point the subdomain at it

Add a DNS **A record**: `mods` -> your droplet IP (wherever your DNS lives).

nginx site config (`/etc/nginx/sites-available/mosim-tracker`):

```nginx
server {
    listen 80;
    server_name mods.yoursite.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/mosim-tracker /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# free HTTPS cert (required for Google sign-in on a real domain)
certbot --nginx -d mods.yoursite.com
```

## 5. Tell Firebase about the domain

Firebase console → **Authentication → Settings → Authorized domains → Add domain**
→ `mods.yoursite.com`. Without this, Google sign-in on the subdomain is rejected.

Done — your tracker is at https://mods.yoursite.com, private robots invisible until
you sign in with your Google account.
