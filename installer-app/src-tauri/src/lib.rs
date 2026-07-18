use tauri::Emitter;

const GITHUB_REPO: &str = "MoSim-Modding-Fun/MoSim-Mod-Tracker";
const SERVER_URL: &str = "https://mods.sebastianw.tech";
const INSTALL_DIR_NAME: &str = "MoSim Mod Tracker";
const APP_EXE_NAME: &str = "MoSim Mod Tracker.exe";

#[derive(serde::Serialize, Clone)]
#[serde(tag = "phase", rename_all = "snake_case")]
enum InstallProgress {
    Fetching,
    Downloading { downloaded: u64, total: u64 },
    Installing,
    Done { exe_path: String },
    Error { message: String },
}

#[tauri::command]
async fn start_install(app: tauri::AppHandle) -> Result<(), String> {
    let _ = app.emit("install-progress", InstallProgress::Fetching);

    let client = reqwest::Client::builder()
        .user_agent("MoSim-Setup/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    // 1. Fetch latest release from GitHub
    let release: serde_json::Value = client
        .get(format!(
            "https://api.github.com/repos/{}/releases/latest",
            GITHUB_REPO
        ))
        .send()
        .await
        .map_err(|e| format!("GitHub API request failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub response: {e}"))?;

    let assets = release["assets"]
        .as_array()
        .ok_or("No assets found in release")?;

    let asset = assets
        .iter()
        .find(|a| {
            a["name"]
                .as_str()
                .map(|n| n.ends_with("_x64-setup.exe"))
                .unwrap_or(false)
        })
        .ok_or("Windows x64 installer not found in latest release")?;

    let download_url = asset["browser_download_url"]
        .as_str()
        .ok_or("Missing download URL")?
        .to_string();

    let total_size = asset["size"].as_u64().unwrap_or(0);

    // 2. Download to temp directory
    let temp_path = std::env::temp_dir().join("MoSimSetup_downloaded.exe");

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
            .map_err(|e| format!("Write failed: {e}"))?;
        downloaded += chunk.len() as u64;
        let _ = app.emit(
            "install-progress",
            InstallProgress::Downloading {
                downloaded,
                total: total_size,
            },
        );
    }

    file.flush()
        .await
        .map_err(|e| format!("Flush failed: {e}"))?;
    drop(file);

    // 3. Run NSIS installer silently
    let _ = app.emit("install-progress", InstallProgress::Installing);

    let status = std::process::Command::new(&temp_path)
        .arg("/S")
        .status()
        .map_err(|e| format!("Failed to launch installer: {e}"))?;

    if !status.success() {
        return Err(format!(
            "Installer exited with code {:?}",
            status.code()
        ));
    }

    // 4. Write mosim.conf next to the installed executable
    let local_app_data =
        std::env::var("LOCALAPPDATA").map_err(|_| "LOCALAPPDATA not set".to_string())?;

    let install_dir = std::path::Path::new(&local_app_data)
        .join("Programs")
        .join(INSTALL_DIR_NAME);

    let conf_path = install_dir.join("mosim.conf");
    std::fs::write(&conf_path, format!("MOSIM_URL={}\n", SERVER_URL))
        .map_err(|e| format!("Cannot write mosim.conf: {e}"))?;

    let exe_path = install_dir.join(APP_EXE_NAME);
    let exe_str = exe_path.to_string_lossy().to_string();

    let _ = app.emit(
        "install-progress",
        InstallProgress::Done { exe_path: exe_str },
    );

    Ok(())
}

#[tauri::command]
async fn launch_app(exe_path: String) -> Result<(), String> {
    std::process::Command::new(&exe_path)
        .spawn()
        .map_err(|e| format!("Cannot launch app: {e}"))?;
    Ok(())
}

#[tauri::command]
async fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            start_install,
            launch_app,
            close_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
