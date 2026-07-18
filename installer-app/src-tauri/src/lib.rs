use tauri::{Emitter, Manager};

const GITHUB_REPO: &str = "dfn-slxxp/MoSim-Mod-Tracker";

#[derive(serde::Serialize, Clone)]
#[serde(tag = "phase", rename_all = "snake_case")]
enum InstallProgress {
    Fetching,
    Downloading { downloaded: u64, total: u64 },
    Installing,
    Done { exe_path: String },
    Error { message: String },
}

/// Asset filename suffix to look for in the GitHub release for this platform/arch.
fn asset_suffix() -> &'static str {
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return "_x64-setup.exe";
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return "_aarch64.dmg";
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    return "_x64.dmg";
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return "_amd64.AppImage";
    #[allow(unreachable_code)]
    ""
}

// ── Windows ───────────────────────────────────────────────────────────────────

/// All paths where the main app exe might live, ordered by likelihood.
#[cfg(target_os = "windows")]
fn win_exe_candidates() -> Vec<std::path::PathBuf> {
    let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
    vec![
        // Tauri default (currentUser NSIS install)
        std::path::Path::new(&local).join("Programs").join("MoSim Mod Tracker").join("MoSim Mod Tracker.exe"),
        std::path::Path::new(&local).join("MoSim Mod Tracker").join("MoSim Mod Tracker.exe"),
        // Elevated / perMachine installs land in Program Files
        std::path::Path::new(r"C:\Program Files").join("MoSim Mod Tracker").join("MoSim Mod Tracker.exe"),
        std::path::Path::new(r"C:\Program Files (x86)").join("MoSim Mod Tracker").join("MoSim Mod Tracker.exe"),
    ]
}

/// Last-resort registry lookup: reads InstallLocation from the NSIS uninstall key.
#[cfg(target_os = "windows")]
fn win_find_via_registry() -> Option<String> {
    let key_names = [
        "MoSim Mod Tracker",
        "com.mosim.mod-tracker",
        "MoSim Mod Tracker_is1",
    ];
    for hive in &["HKCU", "HKLM"] {
        for name in &key_names {
            let key = format!(r"{hive}\Software\Microsoft\Windows\CurrentVersion\Uninstall\{name}");
            if let Ok(out) = std::process::Command::new("reg")
                .args(["query", &key, "/v", "InstallLocation"])
                .output()
            {
                let stdout = String::from_utf8_lossy(&out.stdout);
                for line in stdout.lines() {
                    let t = line.trim();
                    if t.contains("InstallLocation") {
                        if let Some(p) = t.split("REG_SZ").nth(1) {
                            let exe = std::path::Path::new(p.trim()).join("MoSim Mod Tracker.exe");
                            if exe.exists() {
                                return Some(exe.to_string_lossy().into_owned());
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
async fn platform_install(temp_path: &std::path::Path) -> Result<String, String> {
    let status = tokio::process::Command::new(temp_path)
        .arg("/S")
        .status()
        .await
        .map_err(|e| format!("Failed to run installer: {e}"))?;

    if !status.success() {
        return Err(format!("Installer exited with code {:?}", status.code()));
    }

    let candidates = win_exe_candidates();

    // NSIS /S can complete async (e.g. when UAC elevation is involved).
    // Poll all known paths for up to 30 s before giving up.
    for _ in 0..30 {
        for path in &candidates {
            if path.exists() {
                return Ok(path.to_string_lossy().to_string());
            }
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }

    // Final fallback: check registry (covers unusual install locations)
    if let Some(p) = win_find_via_registry() {
        return Ok(p);
    }

    Err(
        "Installation finished but the app could not be located.\n\
         Try launching MoSim Mod Tracker from the Start menu."
            .to_string(),
    )
}

#[cfg(target_os = "windows")]
async fn platform_launch(path: &str) -> Result<(), String> {
    tokio::process::Command::new(path)
        .spawn()
        .map_err(|e| format!("Cannot launch app: {e}"))?;
    Ok(())
}

// ── macOS ─────────────────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
async fn platform_install(temp_path: &std::path::Path) -> Result<String, String> {
    // Mount the DMG
    let output = tokio::process::Command::new("hdiutil")
        .args(["attach", "-nobrowse", "-noverify"])
        .arg(temp_path)
        .output()
        .await
        .map_err(|e| format!("hdiutil attach failed: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to mount DMG: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Parse mount point: tab-separated `device\tfstype\t/Volumes/...`
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mount_point = stdout
        .lines()
        .filter_map(|line| {
            let mp = line.splitn(3, '\t').nth(2)?.trim();
            if mp.starts_with("/Volumes/") { Some(mp.to_string()) } else { None }
        })
        .last()
        .ok_or("Could not parse DMG mount point")?;

    // Find the .app bundle inside the mounted volume
    let mut app_src: Option<std::path::PathBuf> = None;
    if let Ok(mut entries) = tokio::fs::read_dir(&mount_point).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            if entry.file_name().to_string_lossy().ends_with(".app") {
                app_src = Some(entry.path());
                break;
            }
        }
    }
    let app_src = app_src.ok_or("No .app bundle found in DMG")?;
    let app_name = app_src.file_name().unwrap_or_default().to_string_lossy().to_string();

    // Install to ~/Applications (no password required)
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let user_apps = std::path::Path::new(&home).join("Applications");
    let _ = tokio::fs::create_dir_all(&user_apps).await;
    let dest = user_apps.join(&app_name);
    let _ = tokio::fs::remove_dir_all(&dest).await;

    // ditto preserves macOS extended attributes and resource forks
    let status = tokio::process::Command::new("ditto")
        .arg(&app_src)
        .arg(&dest)
        .status()
        .await
        .map_err(|e| format!("ditto failed: {e}"))?;

    // Detach the DMG regardless of copy result
    let _ = tokio::process::Command::new("hdiutil")
        .args(["detach", &mount_point, "-quiet"])
        .status()
        .await;

    if !status.success() {
        return Err("Failed to copy app to ~/Applications".to_string());
    }

    Ok(dest.to_string_lossy().to_string())
}

#[cfg(target_os = "macos")]
async fn platform_launch(app_path: &str) -> Result<(), String> {
    tokio::process::Command::new("open")
        .arg(app_path)
        .spawn()
        .map_err(|e| format!("Cannot open app: {e}"))?;
    Ok(())
}

// ── Linux ─────────────────────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
async fn platform_install(temp_path: &std::path::Path) -> Result<String, String> {
    use std::os::unix::fs::PermissionsExt;

    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let install_dir = std::path::Path::new(&home)
        .join(".local")
        .join("share")
        .join("mosim");

    tokio::fs::create_dir_all(&install_dir)
        .await
        .map_err(|e| format!("Cannot create install dir: {e}"))?;

    let dest = install_dir.join("MoSim-Mod-Tracker.AppImage");
    tokio::fs::copy(temp_path, &dest)
        .await
        .map_err(|e| format!("Cannot copy AppImage: {e}"))?;

    std::fs::set_permissions(&dest, std::fs::Permissions::from_mode(0o755))
        .map_err(|e| format!("chmod failed: {e}"))?;

    // Create a .desktop entry so the app appears in the launcher
    let apps_dir = std::path::Path::new(&home)
        .join(".local").join("share").join("applications");
    let _ = tokio::fs::create_dir_all(&apps_dir).await;
    let _ = tokio::fs::write(
        apps_dir.join("mosim.desktop"),
        format!(
            "[Desktop Entry]\nName=MoSim Mod Tracker\nExec={path}\nType=Application\nCategories=Utility;\n",
            path = dest.display()
        ),
    ).await;

    Ok(dest.to_string_lossy().to_string())
}

#[cfg(target_os = "linux")]
async fn platform_launch(path: &str) -> Result<(), String> {
    tokio::process::Command::new(path)
        .spawn()
        .map_err(|e| format!("Cannot launch app: {e}"))?;
    Ok(())
}

// ── Existing-install detection & uninstall ────────────────────────────────────

#[cfg(target_os = "windows")]
fn existing_install_exe() -> Option<String> {
    win_exe_candidates()
        .into_iter()
        .find(|p| p.exists())
        .map(|p| p.to_string_lossy().into_owned())
        .or_else(win_find_via_registry)
}

#[cfg(target_os = "macos")]
fn existing_install_exe() -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let app = std::path::Path::new(&home).join("Applications").join("MoSim Mod Tracker.app");
    app.exists().then(|| app.to_string_lossy().into_owned())
}

#[cfg(target_os = "linux")]
fn existing_install_exe() -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let app = std::path::Path::new(&home)
        .join(".local").join("share").join("mosim").join("MoSim-Mod-Tracker.AppImage");
    app.exists().then(|| app.to_string_lossy().into_owned())
}

#[tauri::command]
fn check_existing() -> Option<String> {
    existing_install_exe()
}

#[cfg(target_os = "windows")]
async fn platform_uninstall(exe_path: &str) -> Result<(), String> {
    let exe = std::path::Path::new(exe_path);
    let dir = exe.parent().ok_or("Cannot determine install dir")?;
    let uninstaller = dir.join("Uninstall MoSim Mod Tracker.exe");
    if uninstaller.exists() {
        tokio::process::Command::new(&uninstaller)
            .arg("/S")
            .status()
            .await
            .map_err(|e| format!("Uninstaller failed: {e}"))?;
        // Wait for the uninstaller to finish removing files
        for _ in 0..10 {
            if !dir.exists() { break; }
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
    } else {
        tokio::fs::remove_dir_all(dir)
            .await
            .map_err(|e| format!("Cannot remove install dir: {e}"))?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
async fn platform_uninstall(exe_path: &str) -> Result<(), String> {
    tokio::fs::remove_dir_all(exe_path)
        .await
        .map_err(|e| format!("Cannot remove app bundle: {e}"))
}

#[cfg(target_os = "linux")]
async fn platform_uninstall(exe_path: &str) -> Result<(), String> {
    tokio::fs::remove_file(exe_path)
        .await
        .map_err(|e| format!("Cannot remove AppImage: {e}"))
}

#[tauri::command]
async fn uninstall_existing(exe_path: String) -> Result<(), String> {
    platform_uninstall(&exe_path).await
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
async fn start_install(app: tauri::AppHandle) -> Result<(), String> {
    let _ = app.emit("install-progress", InstallProgress::Fetching);

    let client = reqwest::Client::builder()
        .user_agent("MoSim-Setup/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    // The public release only carries the custom installers; the actual app
    // binaries live in a companion prerelease tagged "<tag>-bin" to keep the
    // releases page uncluttered. /releases/latest never returns prereleases,
    // so it always resolves to the main release.
    let latest: serde_json::Value = client
        .get(format!(
            "https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
        ))
        .send()
        .await
        .map_err(|e| format!("GitHub API failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse release info: {e}"))?;

    let tag = latest["tag_name"]
        .as_str()
        .ok_or("Latest release has no tag")?
        .to_string();

    let release: serde_json::Value = client
        .get(format!(
            "https://api.github.com/repos/{GITHUB_REPO}/releases/tags/{tag}-bin"
        ))
        .send()
        .await
        .map_err(|e| format!("GitHub API failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse binaries release: {e}"))?;

    let suffix = asset_suffix();
    let asset = release["assets"]
        .as_array()
        .ok_or(format!("No binaries release found for {tag}"))?
        .iter()
        .find(|a| a["name"].as_str().map(|n| n.ends_with(suffix)).unwrap_or(false))
        .ok_or(format!("No release asset matching *{suffix}"))?;

    let download_url = asset["browser_download_url"]
        .as_str()
        .ok_or("Missing download URL")?
        .to_string();
    let total_size = asset["size"].as_u64().unwrap_or(0);

    // Download to temp
    let ext = if suffix.ends_with(".exe") {
        ".exe"
    } else if suffix.ends_with(".dmg") {
        ".dmg"
    } else {
        ".AppImage"
    };
    let temp_path = std::env::temp_dir().join(format!("MoSimSetup_downloaded{ext}"));

    let resp = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {e}"))?;

    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    let mut file = tokio::fs::File::create(&temp_path)
        .await
        .map_err(|e| format!("Cannot create temp file: {e}"))?;

    let mut downloaded = 0u64;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download interrupted: {e}"))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Write error: {e}"))?;
        downloaded += chunk.len() as u64;
        let _ = app.emit(
            "install-progress",
            InstallProgress::Downloading { downloaded, total: total_size },
        );
    }
    file.flush().await.map_err(|e| format!("Flush failed: {e}"))?;
    drop(file);

    let _ = app.emit("install-progress", InstallProgress::Installing);

    let exe_path = platform_install(&temp_path).await?;

    let _ = app.emit("install-progress", InstallProgress::Done { exe_path });

    Ok(())
}

#[tauri::command]
async fn launch_app(exe_path: String) -> Result<(), String> {
    platform_launch(&exe_path).await
}

#[tauri::command]
async fn close_window(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Window not found".to_string())?
        .close()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            start_install,
            launch_app,
            close_window,
            check_existing,
            uninstall_existing,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
