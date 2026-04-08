#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, Manager, State};

struct SidecarState {
    child: Mutex<Option<Child>>,
    stdin_lock: Mutex<()>,
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
        let sidecar_path = resource_dir.join("sidecar-bundle.mjs");
        Ok(sidecar_path.to_string_lossy().to_string())
    }
}

fn start_sidecar(sidecar_path: &str) -> Result<Child, String> {
    Command::new("node")
        .arg(sidecar_path)
        .stdin(Stdio::piped())
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
    response_tx: std::sync::mpsc::Sender<serde_json::Value>,
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

            if parsed.get("id").is_some() {
                let _ = response_tx.send(parsed);
            } else if let Some(method) = parsed.get("method").and_then(|m| m.as_str()) {
                let data = parsed.get("params").cloned().unwrap_or(serde_json::Value::Null);
                let event_name = format!("sidecar:{}", method);
                let _ = app_handle.emit(&event_name, data);
            }
        }
    });
}

#[tauri::command]
async fn rpc_call(
    state: State<'_, SidecarState>,
    response_rx: State<'_, Mutex<std::sync::mpsc::Receiver<serde_json::Value>>>,
    method: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _stdin_guard = state.stdin_lock.lock().map_err(|e| e.to_string())?;

    let mut guard = state.child.lock().map_err(|e| e.to_string())?;
    let child = guard.as_mut().ok_or("Sidecar not running")?;

    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    });

    let stdin = child.stdin.as_mut().ok_or("No stdin")?;
    let request_line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    writeln!(stdin, "{}", request_line).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;

    drop(guard);

    let rx = response_rx.lock().map_err(|e| e.to_string())?;
    let response = rx
        .recv_timeout(std::time::Duration::from_secs(10))
        .map_err(|e| format!("RPC timeout: {}", e))?;

    if let Some(error) = response.get("error") {
        return Err(error.to_string());
    }

    Ok(response
        .get("result")
        .cloned()
        .unwrap_or(serde_json::Value::Null))
}

fn main() {
    let (response_tx, response_rx) = std::sync::mpsc::channel::<serde_json::Value>();

    tauri::Builder::default()
        .manage(SidecarState {
            child: Mutex::new(None),
            stdin_lock: Mutex::new(()),
        })
        .manage(Mutex::new(response_rx))
        .setup(move |app| {
            let sidecar_path = resolve_sidecar_path(app)?;

            let mut sidecar = start_sidecar(&sidecar_path).map_err(|e| {
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
                    as Box<dyn std::error::Error>
            })?;

            let stdout = sidecar.stdout.take().expect("No sidecar stdout");

            let state: State<SidecarState> = app.state();
            *state.child.lock().unwrap() = Some(sidecar);

            spawn_event_bridge(app.handle().clone(), stdout, response_tx);
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
