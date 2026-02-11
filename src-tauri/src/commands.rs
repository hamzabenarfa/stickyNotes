use tauri::{AppHandle, Manager, State};

use crate::db::Database;
use crate::models::{Note, NoteUpdate, Setting};
use crate::window;

// ─── Note Commands ──────────────────────────────────────────────

#[tauri::command]
pub fn get_notes(db: State<'_, Database>) -> Result<Vec<Note>, String> {
    db.get_all_notes().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_note(id: String, db: State<'_, Database>) -> Result<Note, String> {
    db.get_note(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(color: Option<String>, db: State<'_, Database>) -> Result<Note, String> {
    db.create_note(color).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note(id: String, update: NoteUpdate, db: State<'_, Database>) -> Result<Note, String> {
    db.update_note(&id, update).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_note(id: String, db: State<'_, Database>) -> Result<(), String> {
    db.delete_note(&id).map_err(|e| e.to_string())
}

// ─── Window Commands ────────────────────────────────────────────

#[tauri::command]
pub fn cmd_open_note_window(id: String, app: AppHandle, db: State<'_, Database>) -> Result<(), String> {
    let note = db.get_note(&id).map_err(|e| e.to_string())?;
    window::open_note_window(&app, &note).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_close_note_window(id: String, app: AppHandle) -> Result<(), String> {
    let label = format!("note-{}", id);
    if let Some(win) = app.get_webview_window(&label) {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_open_settings(app: AppHandle) -> Result<(), String> {
    window::open_settings_window(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_open_manager(app: AppHandle) -> Result<(), String> {
    window::open_manager_window(&app).map_err(|e| e.to_string())
}

// ─── Settings Commands ──────────────────────────────────────────

#[tauri::command]
pub fn get_setting(key: String, db: State<'_, Database>) -> Result<String, String> {
    db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(key: String, value: String, db: State<'_, Database>) -> Result<(), String> {
    db.set_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_settings(db: State<'_, Database>) -> Result<Vec<Setting>, String> {
    db.get_all_settings().map_err(|e| e.to_string())
}
