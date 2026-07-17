# Desktop App Installation

The MoSim Mod Tracker desktop app renders its UI locally (no browser, no web page loading) and fetches your data from the server you set up. It stays always-on-top so you can use it alongside Unity or any other app.

---

## Before installing

You need a running MoSim Mod Tracker server. See [server-setup.md](server-setup.md).

Note your server's URL — you'll enter it during first setup. It looks like:
```
https://mods.yoursite.com
```
or for local-only use:
```
http://localhost:8787
```

---

## Windows

### Installing from a release (recommended)

1. Go to the [Releases page](https://github.com/dfn-slxxp/mosim-mod-tracker/releases) on GitHub
2. Download `MoSim.Mod.Tracker_VERSION_x64-setup.exe`
3. Double-click the installer

**SmartScreen warning:** Windows may show "Windows protected your PC" because the app isn't code-signed with a commercial certificate. This is expected.
- Click **More info → Run anyway**

4. The installer opens — it looks like a standard setup wizard. Click through:
   - **Welcome** — click Next
   - **Install Location** — change if you want, or leave the default (`%LocalAppData%\MoSim Mod Tracker`)
   - **Server Configuration** — enter your server URL (e.g. `https://mods.yoursite.com`). This is written to `mosim.conf` next to the app files. You can change it later by editing that file.
   - **Ready to Install** — review and click Install
   - **Finish** — optionally tick "Launch MoSim Mod Tracker" and click Finish

5. The app opens. Click **Sign in with Google** — your default browser opens, you authenticate with Google, and the browser is redirected back to the app automatically.

### Changing the server URL after install

Edit `mosim.conf` in the install folder (default: `%LocalAppData%\MoSim Mod Tracker\`):

```
MOSIM_URL=https://mods.yoursite.com
```

Restart the app after saving.

### Uninstalling

Start menu → search "MoSim Mod Tracker" → right-click → Uninstall.
Or: Settings → Apps → search "MoSim" → Uninstall.

---

## macOS

### Installing from a release (recommended)

1. Go to the [Releases page](https://github.com/dfn-slxxp/mosim-mod-tracker/releases)
2. Download the `.dmg` for your chip:
   - Apple Silicon (M1/M2/M3/M4): `MoSim.Mod.Tracker_VERSION_aarch64.dmg`
   - Intel: `MoSim.Mod.Tracker_VERSION_x64.dmg`
3. Double-click the `.dmg` to mount it
4. Drag **MoSim Mod Tracker** into the **Applications** folder shortcut in the window
5. Eject the disk image (drag it to Trash or press Cmd-E)

**GateKeeper warning:** On first launch macOS may say "cannot be opened because the developer cannot be verified" because the app isn't notarized with an Apple Developer account.

To open it anyway:
- **Right-click** (or Ctrl-click) the app in Applications → **Open** → **Open** in the dialog

You only need to do this once. After the first open, double-clicking works normally.

6. The app opens as a small always-on-top window.

**First-time server URL setup:**

The app reads `mosim.conf` next to the app bundle on launch. Since this doesn't exist yet, it defaults to `http://localhost:8787`.

To point it at your server, create `~/Library/Application Support/com.mosim.mod-tracker/mosim.conf` — or the easiest way: put `mosim.conf` in the same folder as the `.app` file in Applications:

```bash
# In Terminal:
echo "MOSIM_URL=https://mods.yoursite.com" > /Applications/mosim.conf
```

Restart the app.

7. Click **Sign in with Google** — Safari (or your default browser) opens, you authenticate, and the browser redirects back to the app.

### Changing the server URL after install

```bash
echo "MOSIM_URL=https://mods.yoursite.com" > /Applications/mosim.conf
```

Or open the file in any text editor and set:
```
MOSIM_URL=https://mods.yoursite.com
```

### Uninstalling

Drag **MoSim Mod Tracker** from Applications to Trash. To remove all data:
```bash
rm -rf ~/Library/Application\ Support/com.mosim.mod-tracker
```

---

## Linux

### Installing from a release (recommended)

1. Go to the [Releases page](https://github.com/dfn-slxxp/mosim-mod-tracker/releases)
2. Download `mosim-mod-tracker_VERSION_amd64.AppImage`
3. Open a terminal where you downloaded it:

```bash
chmod +x mosim-mod-tracker_VERSION_amd64.AppImage
./mosim-mod-tracker_VERSION_amd64.AppImage
```

That's it — AppImages are self-contained and need no installation.

**Runtime dependency:** WebKitGTK must be installed (it usually is on GNOME desktops):

```bash
# Ubuntu / Debian / Pop!_OS
sudo apt install libwebkit2gtk-4.1-0

# Fedora
sudo dnf install webkit2gtk4.0

# Arch Linux
sudo pacman -S webkit2gtk-4.1
```

**Server URL setup:**

Create a `mosim.conf` file next to the AppImage:

```bash
echo "MOSIM_URL=https://mods.yoursite.com" > mosim.conf
```

Then launch the AppImage. It reads the file automatically.

**To put it in your PATH / applications menu:**

```bash
mkdir -p ~/.local/bin
cp mosim-mod-tracker_VERSION_amd64.AppImage ~/.local/bin/mosim-tracker
echo "MOSIM_URL=https://mods.yoursite.com" > ~/.local/bin/mosim.conf
chmod +x ~/.local/bin/mosim-tracker

# Create a desktop entry
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/mosim-tracker.desktop << EOF
[Desktop Entry]
Type=Application
Name=MoSim Mod Tracker
Exec=$HOME/.local/bin/mosim-tracker
Icon=utilities-system-monitor
Categories=Game;Utility;
EOF
update-desktop-database ~/.local/share/applications
```

### Changing the server URL

Edit `mosim.conf` next to the AppImage:
```
MOSIM_URL=https://mods.yoursite.com
```

### Signing in

Click **Sign in with Google** in the app. Your default browser opens, you authenticate, and the browser is redirected to `mosim://auth?token=...` which brings focus back to the app and signs you in.

If your browser says it doesn't know how to open `mosim://` links, you may need to register the protocol handler. Run once:

```bash
# The AppImage registers this automatically on most distros — if it didn't:
xdg-mime default mosim-tracker.desktop x-scheme-handler/mosim
```

---

## Building from source

If you prefer to build the app yourself rather than downloading a release:

### Prerequisites

- [Rust](https://rustup.rs) (stable toolchain)
- Node.js 20+
- Git
- On Linux: `sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`
- On macOS: Xcode Command Line Tools (`xcode-select --install`)

### Steps

```bash
git clone https://github.com/dfn-slxxp/mosim-mod-tracker.git
cd mosim-mod-tracker

# Install Node dependencies
npm install
npm --prefix web install

# Generate installer assets (needs Python + Pillow)
pip install pillow
python installer/generate-assets.py

# Generate app icons
npm run tauri -- icon installer/assets/icon.png

# Build the installer
npm run build
```

Output:
- **Windows** → `src-tauri/target/release/bundle/nsis/*.exe`
- **macOS** → `src-tauri/target/release/bundle/dmg/*.dmg`
- **Linux** → `src-tauri/target/release/bundle/appimage/*.AppImage`

---

## Troubleshooting

### The app opens but shows "Not signed in" forever

- Confirm your server is running: open `https://mods.yoursite.com` in a browser
- Check that `mosim.conf` has the correct URL (no trailing slash, correct scheme)
- On Linux: make sure the `mosim://` protocol handler is registered (see above)

### Sign-in opens the browser but never returns to the app

The OAuth flow redirects to `mosim://auth?token=...` to pass the session back to the app. If the browser just shows a blank page or error:
- **Windows**: Try right-clicking the app and "Run as administrator" once to force protocol registration
- **macOS**: Check System Settings → Privacy & Security — sometimes the app needs to be approved
- **Linux**: Register the protocol handler manually (see the signing-in section above)

### "The developer cannot be verified" (macOS)

This appears because the app isn't signed with an Apple Developer certificate. Right-click → Open → Open to bypass it. You only need to do this once.

### Windows shows "Windows protected your PC"

Click **More info → Run anyway**. This is expected for apps without an EV code signing certificate.

### App crashes immediately on Linux

Missing WebKitGTK. Install it:
```bash
sudo apt install libwebkit2gtk-4.1-0   # Ubuntu/Debian
```

### How to report a problem

Open an issue at [github.com/dfn-slxxp/mosim-mod-tracker/issues](https://github.com/dfn-slxxp/mosim-mod-tracker/issues) with:
- Your OS and version
- What you expected vs what happened
- The contents of `mosim.conf` (remove your actual server URL if you want)
