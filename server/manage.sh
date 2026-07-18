#!/usr/bin/env bash
# MoSim Mod Tracker — server management script
# Run as root on Ubuntu 22.04 / 24.04.
#
# Usage:
#   bash manage.sh setup    — first-time: install everything, clone repo, nginx, HTTPS
#   bash manage.sh deploy   — pull latest code + rebuild + restart  (use this for updates)
#   bash manage.sh restart  — restart the service without rebuilding
#   bash manage.sh logs     — tail live service logs  (Ctrl-C to exit)
#   bash manage.sh status   — show service health
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Edit these before running 'setup' ────────────────────────────────────────

# Your GitHub repo URL.
#   Public repo:         https://github.com/dfn-slxxp/mosim-mod-tracker.git
#   Private (token):     https://YOUR_TOKEN@github.com/dfn-slxxp/mosim-mod-tracker.git
REPO_URL="https://github.com/dfn-slxxp/MoSim-Mod-Tracker.git"

# The subdomain the app will be served on (must have an A record → this server's IP)
DOMAIN="mods.sebastianw.tech"

# Google OAuth credentials — get these from:
#   console.cloud.google.com → APIs & Services → Credentials
#   → Create OAuth 2.0 Client ID (Web application type)
#   → Add redirect URI: https://DOMAIN/api/auth/callback
GOOGLE_CLIENT_ID=""    # fill in only for a fresh `setup` run on a new droplet
GOOGLE_CLIENT_SECRET=""  # (existing deployments read creds from server/.env on the droplet)

# Where the repo will live on the server
INSTALL_DIR="/apps/mosim-tracker-server"

# Database lives OUTSIDE the repo tree so no git operation, re-clone, or
# directory mixup can ever touch user data. Backed up on every deploy.
DATA_DIR="/var/lib/mosim-tracker"

# Internal port the Node server listens on (nginx proxies to this)
SERVICE_PORT="8787"
# ─────────────────────────────────────────────────────────────────────────────

SERVICE_NAME="mosim-tracker"
BOLD="\e[1m"; GREEN="\e[32m"; YELLOW="\e[33m"; RED="\e[31m"; RESET="\e[0m"

log()  { echo -e "${GREEN}▶ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $*${RESET}"; }
die()  { echo -e "${RED}✖ $*${RESET}"; exit 1; }
hr()   { echo -e "${BOLD}─────────────────────────────────────────${RESET}"; }

# ─────────────────────────────────────────────────────────────────────────────
cmd_setup() {
  [[ $EUID -ne 0 ]] && die "setup must be run as root (sudo bash manage.sh setup)"
  [[ -z "$GOOGLE_CLIENT_ID"     ]] && die "GOOGLE_CLIENT_ID is not set. Edit the variables at the top of manage.sh before running setup."
  [[ -z "$GOOGLE_CLIENT_SECRET" ]] && die "GOOGLE_CLIENT_SECRET is not set. Edit the variables at the top of manage.sh before running setup."

  hr
  log "Installing system packages"
  hr
  apt-get update -qq
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y nodejs nginx certbot python3-certbot-nginx git openssl build-essential python3 >/dev/null
  log "Node $(node --version), nginx, certbot, git installed"

  hr
  log "Cloning repo → $INSTALL_DIR"
  hr
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    warn "Repo already cloned at $INSTALL_DIR — skipping clone, continuing setup."
    git config --global --add safe.directory "$INSTALL_DIR" 2>/dev/null || true
    git -C "$INSTALL_DIR" pull
  else
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
  chown -R www-data:www-data "$INSTALL_DIR"

  hr
  log "Writing server/.env"
  hr
  _write_env
  _migrate_data

  hr
  log "Installing npm dependencies"
  hr
  _install_deps

  hr
  log "Building web app"
  hr
  _build

  hr
  log "Creating systemd service"
  hr
  _write_service
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME" 2>/dev/null || systemctl start "$SERVICE_NAME"
  sleep 1
  systemctl is-active --quiet "$SERVICE_NAME" \
    && log "Service started OK" \
    || die "Service failed to start — run: journalctl -u $SERVICE_NAME -n 30"

  hr
  log "Configuring nginx"
  hr
  _write_nginx
  nginx -t
  systemctl reload nginx

  hr
  log "Obtaining HTTPS certificate"
  hr
  echo ""
  warn "About to run certbot. It will ask for your email address."
  echo ""
  certbot --nginx -d "$DOMAIN"
  systemctl reload nginx

  hr
  log "Setup complete!"
  hr
  echo ""
  echo -e "  App:     ${BOLD}https://$DOMAIN${RESET}"
  echo -e "  Service: systemctl status $SERVICE_NAME"
  echo -e "  Logs:    bash manage.sh logs"
  echo -e "  Update:  bash manage.sh deploy"
  echo ""
  warn "LAST STEP: Add the callback URI in Google Cloud Console."
  warn "  console.cloud.google.com → APIs & Services → Credentials"
  warn "  → Your OAuth 2.0 Client ID → Authorized redirect URIs → Add:"
  warn "      https://$DOMAIN/api/auth/callback"
  warn "Without this, Google sign-in will fail with redirect_uri_mismatch."
  echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_deploy() {
  [[ $EUID -ne 0 ]] && die "deploy must be run as root"
  [[ -d "$INSTALL_DIR/.git" ]] || die "Repo not found at $INSTALL_DIR. Run setup first."

  # The repo is owned by www-data after chown; git refuses to run as root unless
  # this directory is explicitly marked safe.
  git config --global --add safe.directory "$INSTALL_DIR" 2>/dev/null || true

  hr
  log "Backing up database"
  hr
  _backup_data
  _migrate_data

  hr
  log "Pulling latest code"
  hr
  git -C "$INSTALL_DIR" pull

  # Re-write env if Google credentials were updated in manage.sh
  if [[ -n "$GOOGLE_CLIENT_ID" && -n "$GOOGLE_CLIENT_SECRET" ]]; then
    _write_env
  fi

  hr
  log "Installing/updating npm dependencies"
  hr
  _install_deps

  hr
  log "Rebuilding web app"
  hr
  _build

  hr
  log "Restarting service"
  hr
  if ! systemctl cat "$SERVICE_NAME" &>/dev/null; then
    warn "Service not found — creating it now."
    _write_service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
  fi
  systemctl restart "$SERVICE_NAME"
  sleep 1
  systemctl is-active --quiet "$SERVICE_NAME" \
    && log "Service restarted OK" \
    || die "Service failed — run: bash manage.sh logs"

  log "Deploy complete — https://$DOMAIN is live"
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_restart() {
  [[ $EUID -ne 0 ]] && die "restart must be run as root"
  systemctl restart "$SERVICE_NAME"
  sleep 1
  systemctl is-active --quiet "$SERVICE_NAME" \
    && log "Service restarted" \
    || die "Service failed to start — run: bash manage.sh logs"
}

cmd_logs() {
  journalctl -u "$SERVICE_NAME" -f --no-pager
}

cmd_status() {
  systemctl status "$SERVICE_NAME" --no-pager
  echo ""
  log "Disk usage"
  du -sh "$INSTALL_DIR/web/dist"  2>/dev/null || true
  du -sh "$DATA_DIR/data.db" 2>/dev/null \
    || du -sh "$INSTALL_DIR/server/data.db" 2>/dev/null \
    || echo "  data.db not found yet"
  ls -1t "$DATA_DIR/backups"/data-*.db 2>/dev/null | head -3 | sed 's/^/  backup: /' || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers

# One-time move of data.db out of the repo tree + point .env at it.
_migrate_data() {
  mkdir -p "$DATA_DIR/backups"
  if [[ -f "$INSTALL_DIR/server/data.db" && ! -f "$DATA_DIR/data.db" ]]; then
    log "Moving database out of the repo tree → $DATA_DIR"
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    mv "$INSTALL_DIR/server/data.db" "$DATA_DIR/data.db"
    [[ -f "$INSTALL_DIR/server/data.db-wal" ]] && mv "$INSTALL_DIR/server/data.db-wal" "$DATA_DIR/data.db-wal"
    [[ -f "$INSTALL_DIR/server/data.db-shm" ]] && mv "$INSTALL_DIR/server/data.db-shm" "$DATA_DIR/data.db-shm"
  fi
  # Ensure the server reads the external DB (db.js honors DB_PATH)
  if [[ -f "$INSTALL_DIR/server/.env" ]] && ! grep -q '^DB_PATH=' "$INSTALL_DIR/server/.env"; then
    echo "DB_PATH=$DATA_DIR/data.db" >> "$INSTALL_DIR/server/.env"
  fi
  chown -R www-data:www-data "$DATA_DIR"
}

# Timestamped copy of the DB before each deploy; keeps the last 10.
_backup_data() {
  mkdir -p "$DATA_DIR/backups"
  local src="$DATA_DIR/data.db"
  [[ -f "$src" ]] || src="$INSTALL_DIR/server/data.db"   # pre-migration location
  if [[ -f "$src" ]]; then
    local stamp
    stamp=$(date +%Y%m%d-%H%M%S)
    cp "$src" "$DATA_DIR/backups/data-$stamp.db"
    [[ -f "$src-wal" ]] && cp "$src-wal" "$DATA_DIR/backups/data-$stamp.db-wal"
    # Prune: keep the 10 newest backups
    ls -1t "$DATA_DIR/backups"/data-*.db 2>/dev/null | tail -n +11 | while read -r f; do
      rm -f "$f" "$f-wal"
    done
    log "Database backed up → backups/data-$stamp.db (keeping last 10)"
  else
    warn "No database found to back up yet (fresh install?)"
  fi
}

_install_deps() {
  # chown FIRST, then install as www-data with its own npm cache. Running npm
  # as root in a www-data-owned tree makes npm drop lifecycle scripts to
  # www-data while the cache stays root-owned, so native builds (better-sqlite3)
  # fail silently and the .node binary never gets written.
  chown -R www-data:www-data "$INSTALL_DIR"
  local cache="$INSTALL_DIR/.npm-cache"
  mkdir -p "$cache" && chown www-data:www-data "$cache"

  # Newer npm blocks package install scripts unless approved (allowScripts).
  # better-sqlite3 needs its node-gyp build script, esbuild its postinstall.
  # `|| true` keeps this compatible with older npm without the feature.
  su -s /bin/bash www-data -c "cd $INSTALL_DIR/server && npm_config_cache=$cache npm install-scripts approve better-sqlite3" 2>/dev/null || true
  su -s /bin/bash www-data -c "cd $INSTALL_DIR/web && npm_config_cache=$cache npm install-scripts approve esbuild" 2>/dev/null || true

  su -s /bin/bash www-data -c "npm_config_cache=$cache npm --prefix $INSTALL_DIR/server install --omit=dev"
  su -s /bin/bash www-data -c "npm_config_cache=$cache npm --prefix $INSTALL_DIR/web install"

  # Verify the native module actually loads; rebuild if not.
  if ! su -s /bin/bash www-data -c "cd $INSTALL_DIR/server && node -e \"require('better-sqlite3')\"" 2>/dev/null; then
    warn "better-sqlite3 native module broken — rebuilding"
    su -s /bin/bash www-data -c "cd $INSTALL_DIR/server && npm_config_cache=$cache npm rebuild better-sqlite3"
    su -s /bin/bash www-data -c "cd $INSTALL_DIR/server && node -e \"require('better-sqlite3')\"" \
      || die "better-sqlite3 still won't load — check node/npm versions (node $(node --version))"
  fi
}

_build() {
  su -s /bin/bash www-data -c "npm --prefix $INSTALL_DIR/web run build"
  log "Build complete — $(du -sh $INSTALL_DIR/web/dist | cut -f1) in web/dist"
}

_write_env() {
  # Preserve the JWT secret across redeploys so sessions don't get invalidated.
  local jwt_secret=""
  if [[ -f "$INSTALL_DIR/server/.env" ]]; then
    jwt_secret=$(grep '^JWT_SECRET=' "$INSTALL_DIR/server/.env" 2>/dev/null | cut -d= -f2- || true)
  fi
  [[ -z "$jwt_secret" ]] && jwt_secret=$(openssl rand -hex 32)

  cat > "$INSTALL_DIR/server/.env" << EOF
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
OAUTH_REDIRECT_URI=https://$DOMAIN/api/auth/callback
JWT_SECRET=$jwt_secret
NODE_ENV=production
PORT=$SERVICE_PORT
DB_PATH=$DATA_DIR/data.db
EOF
  chmod 600 "$INSTALL_DIR/server/.env"
  chown www-data:www-data "$INSTALL_DIR/server/.env"
  log ".env written (JWT secret preserved: $([[ -n "$jwt_secret" ]] && echo yes || echo freshly generated))"
}

_write_service() {
  cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=MoSim Mod Tracker
After=network.target

[Service]
WorkingDirectory=$INSTALL_DIR/server
ExecStart=/usr/bin/node server.js
EnvironmentFile=$INSTALL_DIR/server/.env
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
EOF
}

_write_nginx() {
  cat > "/etc/nginx/sites-available/$SERVICE_NAME" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass         http://127.0.0.1:$SERVICE_PORT;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
EOF
  if [[ ! -L "/etc/nginx/sites-enabled/$SERVICE_NAME" ]]; then
    ln -s "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/$SERVICE_NAME"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
case "${1:-}" in
  setup)   cmd_setup   ;;
  deploy)  cmd_deploy  ;;
  restart) cmd_restart ;;
  logs)    cmd_logs    ;;
  status)  cmd_status  ;;
  *)
    echo "Usage: bash manage.sh {setup|deploy|restart|logs|status}"
    echo ""
    echo "  setup   — first-time install (run once on a fresh droplet)"
    echo "  deploy  — git pull + rebuild + restart  (use for updates)"
    echo "  restart — restart service without rebuilding"
    echo "  logs    — tail live logs"
    echo "  status  — service health + disk usage"
    exit 1
    ;;
esac
