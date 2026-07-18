use std::path::PathBuf;

pub fn get_server_url() -> String {
    if let Ok(url) = std::env::var("MOSIM_URL") {
        return url;
    }
    if let Some(conf) = find_conf() {
        if let Ok(content) = std::fs::read_to_string(conf) {
            for line in content.lines() {
                if let Some(url) = line.strip_prefix("MOSIM_URL=") {
                    let url = url.trim();
                    if !url.is_empty() {
                        return url.to_string();
                    }
                }
            }
        }
    }
    "http://localhost:8787".to_string()
}

pub fn has_server_configured() -> bool {
    if std::env::var("MOSIM_URL").is_ok() {
        return true;
    }
    find_conf().is_some()
}

pub fn set_server_url(url: &str) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or_else(|| "cannot determine install directory".to_string())?;
    let conf = dir.join("mosim.conf");
    std::fs::write(&conf, format!("MOSIM_URL={}\n", url)).map_err(|e| e.to_string())
}

fn find_conf() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let dir = exe.parent()?;
    let conf = dir.join("mosim.conf");
    if conf.exists() { Some(conf) } else { None }
}
