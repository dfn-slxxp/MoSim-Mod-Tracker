mod commands;
mod config;

use tauri::{Emitter, Listener};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Forward mosim://auth?token=<jwt> deep links to the frontend.
            // The Tauri deep-link plugin emits "deep-link://new-url" with a
            // JSON-encoded array of URL strings as the payload.
            app.listen("deep-link://new-url", move |event| {
                if let Ok(urls) = serde_json::from_str::<Vec<String>>(event.payload()) {
                    for url_str in urls {
                        if let Ok(url) = url::Url::parse(&url_str) {
                            if url.scheme() == "mosim" && url.host_str() == Some("auth") {
                                if let Some(token) = url
                                    .query_pairs()
                                    .find(|(k, _)| k == "token")
                                    .map(|(_, v)| v.into_owned())
                                {
                                    let _ = handle.emit("mosim:auth-token", &token);
                                }
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_server_url,
            commands::has_server_configured,
            commands::set_server_url,
            commands::toggle_pin,
            commands::is_pinned,
            commands::set_expanded,
            commands::close_window,
            commands::open_path,
            commands::scan_repo,
            commands::read_script,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
