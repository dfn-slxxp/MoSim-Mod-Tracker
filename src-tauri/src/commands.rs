use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{LogicalSize, Size, Window};

// ── Result types ──────────────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RobotInfo {
    name: String,
    rel_path: String,
    last_modified: u64,
    scripts: Vec<String>,
}

#[derive(Serialize)]
pub struct ScanResult {
    ok: bool,
    error: Option<String>,
    robots: Vec<RobotInfo>,
}

#[derive(Serialize)]
pub struct ScriptResult {
    ok: bool,
    error: Option<String>,
    content: String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_server_url() -> String {
    crate::config::get_server_url()
}


#[tauri::command]
pub fn toggle_pin(window: Window) -> bool {
    let next = !window.is_always_on_top().unwrap_or(false);
    let _ = window.set_always_on_top(next);
    next
}

#[tauri::command]
pub fn is_pinned(window: Window) -> bool {
    window.is_always_on_top().unwrap_or(false)
}

#[tauri::command]
pub fn set_expanded(window: Window, expanded: bool) {
    let (w, h): (f64, f64) = if expanded { (1150.0, 760.0) } else { (360.0, 640.0) };
    let _ = window.set_size(Size::Logical(LogicalSize { width: w, height: h }));
    if expanded {
        let _ = window.center();
    }
}

#[tauri::command]
pub fn close_window(window: Window) {
    let _ = window.close();
}

#[tauri::command]
pub fn minimize_window(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn toggle_maximize(window: Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
pub async fn open_path(path_or_url: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    if path_or_url.starts_with("http://") || path_or_url.starts_with("https://") {
        return app.shell().open(&path_or_url, None).map_err(|e| e.to_string());
    }
    #[cfg(target_os = "windows")]
    {
        app.shell()
            .command("explorer")
            .args([&path_or_url])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "macos")]
    {
        app.shell()
            .command("open")
            .args([&path_or_url])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "linux")]
    {
        app.shell()
            .command("xdg-open")
            .args([&path_or_url])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn scan_repo(local_path: String) -> ScanResult {
    if local_path.is_empty() || !Path::new(&local_path).exists() {
        return ScanResult {
            ok: false,
            error: Some(format!("Path not found: {}", local_path)),
            robots: vec![],
        };
    }
    match do_scan(&local_path) {
        Ok(robots) => ScanResult { ok: true, error: None, robots },
        Err(e) => ScanResult { ok: false, error: Some(e), robots: vec![] },
    }
}

#[tauri::command]
pub fn read_script(repo_path: String, rel_path: String) -> ScriptResult {
    if !rel_path.ends_with(".cs") {
        return ScriptResult {
            ok: false,
            error: Some("Only .cs files can be read".into()),
            content: String::new(),
        };
    }
    // Reject obvious traversal before canonicalize (canonicalize fails on non-existent paths)
    if rel_path.contains("..") {
        return ScriptResult {
            ok: false,
            error: Some("Path traversal rejected".into()),
            content: String::new(),
        };
    }
    let canon_repo = match PathBuf::from(&repo_path).canonicalize() {
        Ok(p) => p,
        Err(e) => return ScriptResult { ok: false, error: Some(e.to_string()), content: String::new() },
    };
    let canon_full = match canon_repo.join(&rel_path).canonicalize() {
        Ok(p) => p,
        Err(e) => return ScriptResult { ok: false, error: Some(e.to_string()), content: String::new() },
    };
    if !canon_full.starts_with(&canon_repo) {
        return ScriptResult {
            ok: false,
            error: Some("Path escapes the repo".into()),
            content: String::new(),
        };
    }
    match std::fs::read_to_string(&canon_full) {
        Ok(content) => ScriptResult { ok: true, error: None, content },
        Err(e) => ScriptResult { ok: false, error: Some(e.to_string()), content: String::new() },
    }
}

// ── Repo scanner — mirrors Electron main.js logic exactly ────────────────────

const SKIP: &[&str] = &[
    "Library", "Temp", "obj", "Logs", "node_modules",
    ".git", ".idea", "UserSettings",
];

fn do_scan(repo_path: &str) -> Result<Vec<RobotInfo>, String> {
    let root = PathBuf::from(repo_path);
    let is_git = root.join(".git").exists();
    let mut robots: Vec<RobotInfo> = Vec::new();
    let mut stack: Vec<PathBuf> = vec![root.clone()];

    while let Some(dir) = stack.pop() {
        let entries = match std::fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let dir_str = dir.to_string_lossy().replace('\\', "/");
        let base = dir.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let is_container = base == "Robots" || base == "Mods";
        let under_robots = dir_str.contains("/Robots/") || dir_str.ends_with("/Robots");

        let mut subdirs: Vec<PathBuf> = Vec::new();
        let mut has_prefab = false;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if !SKIP.contains(&name) {
                    subdirs.push(path);
                }
            } else if under_robots && !is_container {
                if path.extension().and_then(|e| e.to_str()) == Some("prefab") {
                    has_prefab = true;
                }
            }
        }

        if has_prefab {
            let rel_path = dir
                .strip_prefix(&root)
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_default();
            let scripts = collect_scripts(&dir, &root);
            let git_ts = if is_git { git_mtime(repo_path, &rel_path) } else { 0 };
            let fs_ts = newest_mtime(&dir, 3);
            robots.push(RobotInfo {
                name: base,
                rel_path,
                last_modified: git_ts.max(fs_ts),
                scripts,
            });
            // Don't descend into robot folders — matches Electron behaviour
            continue;
        }

        stack.extend(subdirs);
    }

    robots.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(robots)
}

fn collect_scripts(robot_dir: &Path, repo_root: &Path) -> Vec<String> {
    let mut scripts = Vec::new();
    let mut stack = vec![robot_dir.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                } else if path.extension().and_then(|e| e.to_str()) == Some("cs") {
                    if let Ok(rel) = path.strip_prefix(repo_root) {
                        scripts.push(rel.to_string_lossy().replace('\\', "/"));
                    }
                }
            }
        }
    }
    scripts.sort();
    scripts
}

fn git_mtime(repo_path: &str, rel: &str) -> u64 {
    let out = Command::new("git")
        .args(["-C", repo_path, "log", "-1", "--format=%ct", "--", rel])
        .output();
    if let Ok(out) = out {
        if let Ok(s) = std::str::from_utf8(&out.stdout) {
            if let Ok(ts) = s.trim().parse::<u64>() {
                return ts * 1000;
            }
        }
    }
    0
}

fn newest_mtime(dir: &Path, depth: u32) -> u64 {
    if depth == 0 { return 0; }
    let mut newest = 0u64;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                newest = newest.max(newest_mtime(&path, depth - 1));
            } else if let Ok(meta) = entry.metadata() {
                if let Ok(t) = meta.modified() {
                    if let Ok(d) = t.duration_since(std::time::UNIX_EPOCH) {
                        newest = newest.max(d.as_millis() as u64);
                    }
                }
            }
        }
    }
    newest
}
