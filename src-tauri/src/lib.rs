mod commands;
mod db;
mod models;
mod window;

use db::Database;
use tauri::Manager;

/// Build and run the Tauri application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Single instance: if a second instance launches, focus the manager ──
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Err(e) = window::open_manager_window(app) {
                eprintln!("Failed to focus manager on second instance: {e}");
            }
        }))
        .plugin(tauri_plugin_shell::init())
        // ── Initialize database and store in managed state ──
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let database = Database::init(app_data_dir)
                .expect("Failed to initialize database");

            app.manage(database);

            // Open all notes that were open in the last session
            {
                let db = app.state::<Database>();
                if let Ok(notes) = db.get_all_notes() {
                    for note in notes.iter().filter(|n| n.is_open) {
                        if let Err(e) = window::open_note_window(app.handle(), note) {
                            eprintln!("Failed to restore note window {}: {e}", note.id);
                        }
                    }
                }
            }

            Ok(())
        })
        // ── Register IPC commands ──
        .invoke_handler(tauri::generate_handler![
            commands::get_notes,
            commands::get_note,
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            commands::cmd_open_note_window,
            commands::cmd_close_note_window,
            commands::cmd_open_settings,
            commands::cmd_open_manager,
            commands::get_setting,
            commands::set_setting,
            commands::get_all_settings,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running StickyNotes");
}
