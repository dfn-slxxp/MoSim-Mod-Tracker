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

set -euo pipefail   # exit on any error, treat unset vars as errors

# ── Edit these before running 'setup' ────────────────────────────────────────
#
# Your GitHub repo URL. Options:
#   Public repo:          https://github.com/dfn-slxxp/mosim-mod-tracker.git
#   Private (token):      https://YOUR_TOKEN@github.com/dfn-slxxp/mosim-mod-tracker.git
#   Private (SSH key):    git@github.com:dfn-slxxp/mosim-mod-tracker.git
#
# To create a token: GitHub → Settings → Developer settings →
#   Personal access tokens (classic) → New token → tick "repo" → copy it.
#
REPO_URL="https://github.com/dfn-slxxp/mosim-mod-tracker.git"

# The subdomain the app will be served on (must have an A record → this server's IP)
DOMAIN="mods.yoursite.com"

# Where the repo will live on the server
INSTALL_DIR="/opt/mosim-tracker"

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

  hr
  log "Installing system packages"
  hr
  apt-get update -qq
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y nodejs nginx certbot python3-certbot-nginx git >/dev/null
  log "Node $(node --version), nginx $(nginx -v 2>&1 | grep -o '[0-9.]*' | head -1), git $(git --version | cut -d' ' -f3) installed"

  hr
  log "Cloning repo → $INSTALL_DIR"
  hr
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    warn "Repo already cloned. Running deploy instead of re-cloning."
    cmd_deploy
    return
  fi
  git clone "$REPO_URL" "$INSTALL_DIR"
  chown -R www-data:www-data "$INSTALL_DIR"

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
  systemctl start  "$SERVICE_NAME"
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
  warn "LAST STEP: Firebase console → Authentication → Settings → Authorized domains"
  warn "→ Add domain: $DOMAIN"
  warn "Without this, Google sign-in on your subdomain will be rejected."
  echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_deploy() {
  [[ $EUID -ne 0 ]] && die "deploy must be run as root"
  [[ -d "$INSTALL_DIR/.git" ]] || die "Repo not found at $INSTALL_DIR. Run setup first."

  hr
  log "Pulling latest code"
  hr
  git -C "$INSTALL_DIR" pull

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
  du -sh "$INSTALL_DIR/web/dist" 2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers

_install_deps() {
  # server/  — runtime deps only (express, compression)
  npm --prefix "$INSTALL_DIR/server" install --omit=dev --silent
  # web/     — needs devDeps to build (vite, typescript, etc.)
  npm --prefix "$INSTALL_DIR/web"    install --silent
  chown -R www-data:www-data "$INSTALL_DIR"
}

_build() {
  # Run as www-data so the output files are owned correctly
  su -s /bin/bash www-data -c "npm --prefix $INSTALL_DIR/web run build"
  log "Build complete — $(du -sh $INSTALL_DIR/web/dist | cut -f1) in web/dist"
}

_write_service() {
  cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=MoSim Mod Tracker
After=network.target

[Service]
WorkingDirectory=$INSTALL_DIR/server
ExecStart=/usr/bin/node server.js
Environment=PORT=$SERVICE_PORT
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
  # Enable site only if not already linked
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
