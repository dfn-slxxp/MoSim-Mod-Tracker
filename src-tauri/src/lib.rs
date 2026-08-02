mod commands;
mod config;

use tauri::{Emitter, Listener, Manager};

/// Pull the JWT out of a mosim://auth?token=... deep link URL.
fn extract_token(url_str: &str) -> Option<String> {
    let url = url::Url::parse(url_str).ok()?;
    if url.scheme() == "mosim" && url.host_str() == Some("auth") {
        url.query_pairs()
            .find(|(k, _)| k == "token")
            .map(|(_, v)| v.into_owned())
    } else {
        None
    }
}

/// Auth token captured from argv on a cold start (browser launched the app
/// with the deep link before the frontend was listening). The frontend
/// collects it via take_pending_auth_token once its listener is ready.
struct PendingToken(std::sync::Mutex<Option<String>>);

#[tauri::command]
fn take_pending_auth_token(state: tauri::State<PendingToken>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Cold start: Windows/Linux pass the deep link as a CLI argument.
    let startup_token = std::env::args().find_map(|a| extract_token(&a));

    tauri::Builder::default()
        .manage(PendingToken(std::sync::Mutex::new(startup_token)))
        .plugin(tauri_plugin_shell::init())
        // Single-instance must come before deep-link. When the browser opens
        // mosim:// while the app runs, Windows spawns a second process whose
        // argv carries the URL; this callback runs in the FIRST instance with
        // that argv. Extract the token here directly — do not rely on the
        // deep-link plugin re-emitting it (that path proved unreliable).
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            for arg in &argv {
                if let Some(token) = extract_token(arg) {
                    let _ = app.emit("mosim:auth-token", &token);
                }
            }
            // Bring the app back into view when the sign-in redirect lands.
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Forward mosim://auth?token=<jwt> deep links to the frontend.
            // The deep-link plugin emits "deep-link://new-url" with a
            // JSON-encoded array of URL strings as the payload.
            app.listen("deep-link://new-url", move |event| {
                if let Ok(urls) = serde_json::from_str::<Vec<String>>(event.payload()) {
                    for url_str in urls {
                        if let Some(token) = extract_token(&url_str) {
                            let _ = handle.emit("mosim:auth-token", &token);
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_server_url,
            commands::toggle_pin,
            commands::is_pinned,
            commands::set_expanded,
            commands::close_window,
            commands::minimize_window,
            commands::toggle_maximize,
            commands::start_dragging,
            commands::open_path,
            commands::scan_repo,
            commands::read_script,
            commands::list_cs_files,
            take_pending_auth_token,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
