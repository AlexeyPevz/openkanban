#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader, Write};
use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, Manager, State};

struct SidecarState {
    child: Mutex<Option<Child>>,
    stdin_lock: Mutex<()>,
    pending_requests: Arc<Mutex<HashMap<u64, std::sync::mpsc::Sender<serde_json::Value>>>>,
    next_request_id: AtomicU64,
    project_dir: Mutex<Option<String>>,
}

fn next_request_id(counter: &AtomicU64) -> u64 {
    counter.fetch_add(1, Ordering::Relaxed) + 1
}

fn extract_request_id(value: &serde_json::Value) -> Option<u64> {
    value
        .get("id")
        .and_then(|id| match id {
            serde_json::Value::Number(n) => n.as_u64(),
            serde_json::Value::String(s) => s.parse::<u64>().ok(),
            _ => None,
        })
}

fn parse_directory_from_args(args: &[String]) -> Option<String> {
    args.windows(2)
        .find(|pair| pair[0] == "--directory")
        .map(|pair| pair[1].clone())
}

fn parse_directory_arg() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    parse_directory_from_args(&args)
}

fn resolve_sidecar_path(app: &tauri::App) -> Result<String, Box<dyn std::error::Error>> {
    if cfg!(debug_assertions) {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let sidecar_path = std::path::Path::new(manifest_dir)
            .join("../../../packages/sidecar/dist/index.js")
            .canonicalize()?;
        Ok(sidecar_path.to_string_lossy().to_string())
    } else {
        let resource_dir = app.path().resource_dir()?;
        let sidecar_path = resource_dir.join("sidecar-bundle.cjs");
        Ok(sidecar_path.to_string_lossy().to_string())
    }
}

fn start_sidecar(sidecar_path: &str, project_dir: Option<&str>) -> Result<Child, String> {
    let mut cmd = Command::new("node");
    cmd.arg(sidecar_path);

    if let Some(dir) = project_dir {
        cmd.current_dir(dir);
    }

    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start sidecar: {}", e))
}

/// Spawn a background thread that continuously reads stdout from the sidecar.
/// Lines that are JSON-RPC notifications (no "id" field) are forwarded as
/// Tauri events to the webview. Lines that are responses (have "id") are
/// sent back through a response channel for `rpc_call` to pick up.
fn spawn_event_bridge(
    app_handle: AppHandle,
    stdout: std::process::ChildStdout,
    pending_requests: Arc<Mutex<HashMap<u64, std::sync::mpsc::Sender<serde_json::Value>>>>,
) {
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => break,
            };
            if line.trim().is_empty() {
                continue;
            }
            let parsed: serde_json::Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => continue,
            };

            if let Some(request_id) = extract_request_id(&parsed) {
                let pending_tx = match pending_requests.lock() {
                    Ok(mut pending) => pending.remove(&request_id),
                    Err(_) => None,
                };

                if let Some(tx) = pending_tx {
                    let _ = tx.send(parsed);
                }
            } else if let Some(method) = parsed.get("method").and_then(|m| m.as_str()) {
                let data = parsed.get("params").cloned().unwrap_or(serde_json::Value::Null);
                let event_name = format!("sidecar:{}", method);
                let _ = app_handle.emit(&event_name, data);
            }
        }
    });
}

fn spawn_stderr_logger(stderr: std::process::ChildStderr) {
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(message) if !message.trim().is_empty() => {
                    eprintln!("[sidecar stderr] {}", message);
                }
                Ok(_) => {}
                Err(err) => {
                    eprintln!("[sidecar stderr read error] {}", err);
                    break;
                }
            }
        }
    });
}

#[tauri::command]
async fn rpc_call(
    state: State<'_, SidecarState>,
    method: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let request_id = next_request_id(&state.next_request_id);
    let (response_tx, response_rx) = std::sync::mpsc::channel::<serde_json::Value>();

    {
        let mut pending = state.pending_requests.lock().map_err(|e| e.to_string())?;
        pending.insert(request_id, response_tx);
    }

    let write_result: Result<(), String> = (|| {
        let _stdin_guard = state.stdin_lock.lock().map_err(|e| e.to_string())?;

        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        let child = guard
            .as_mut()
            .ok_or_else(|| "Sidecar not running".to_string())?;

        let request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params,
        });

        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "No stdin".to_string())?;
        let request_line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
        writeln!(stdin, "{}", request_line).map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())
    })();

    if let Err(err) = write_result {
        if let Ok(mut pending) = state.pending_requests.lock() {
            pending.remove(&request_id);
        }
        return Err(err);
    }

    let response = match response_rx.recv_timeout(std::time::Duration::from_secs(10)) {
        Ok(value) => value,
        Err(e) => {
            if let Ok(mut pending) = state.pending_requests.lock() {
                pending.remove(&request_id);
            }
            return Err(format!("RPC timeout: {}", e));
        }
    };

    if let Some(error) = response.get("error") {
        return Err(error.to_string());
    }

    Ok(response
        .get("result")
        .cloned()
        .unwrap_or(serde_json::Value::Null))
}

fn main() {
    let project_dir = parse_directory_arg();

    tauri::Builder::default()
        .manage(SidecarState {
            child: Mutex::new(None),
            stdin_lock: Mutex::new(()),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
            next_request_id: AtomicU64::new(0),
            project_dir: Mutex::new(project_dir.clone()),
        })
        .setup(move |app| {
            let sidecar_path = resolve_sidecar_path(app)?;
            let state: State<SidecarState> = app.state();
            let project_dir = state.project_dir.lock().unwrap().clone();

            let mut sidecar = start_sidecar(&sidecar_path, project_dir.as_deref()).map_err(|e| {
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
                    as Box<dyn std::error::Error>
            })?;

            let stdout = sidecar.stdout.take().expect("No sidecar stdout");
            let stderr = sidecar.stderr.take().expect("No sidecar stderr");

            let pending_requests = state.pending_requests.clone();
            *state.child.lock().unwrap() = Some(sidecar);

            if let Some(ref dir) = project_dir {
                let _ = app.handle().emit("launch:directory", dir);
            }

            spawn_event_bridge(app.handle().clone(), stdout, pending_requests);
            spawn_stderr_logger(stderr);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![rpc_call])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Sidecar cleanup happens via Drop
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn next_request_id_is_unique_and_monotonic() {
        let counter = AtomicU64::new(0);

        let first = next_request_id(&counter);
        let second = next_request_id(&counter);
        let third = next_request_id(&counter);

        assert_eq!(first, 1);
        assert_eq!(second, 2);
        assert_eq!(third, 3);
    }

    #[test]
    fn extract_request_id_supports_numeric_and_string_ids() {
        let numeric = serde_json::json!({ "id": 42 });
        let string = serde_json::json!({ "id": "77" });
        let invalid = serde_json::json!({ "id": "invalid" });
        let missing = serde_json::json!({ "jsonrpc": "2.0" });

        assert_eq!(extract_request_id(&numeric), Some(42));
        assert_eq!(extract_request_id(&string), Some(77));
        assert_eq!(extract_request_id(&invalid), None);
        assert_eq!(extract_request_id(&missing), None);
    }

    #[test]
    fn parse_directory_from_args_extracts_path() {
        let args = vec!["binary".into(), "--directory".into(), "/my/project".into()];
        assert_eq!(parse_directory_from_args(&args), Some("/my/project".to_string()));
    }

    #[test]
    fn parse_directory_from_args_returns_none_when_missing() {
        let args = vec!["binary".into()];
        assert_eq!(parse_directory_from_args(&args), None);
    }

    #[test]
    fn parse_directory_from_args_returns_none_when_no_value() {
        let args = vec!["binary".into(), "--directory".into()];
        assert_eq!(parse_directory_from_args(&args), None);
    }
}
