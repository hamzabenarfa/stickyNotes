use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::models::Note;

/// Open (or focus) the manager dashboard window.
pub fn open_manager_window(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("manager") {
        window.set_focus()?;
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "manager", WebviewUrl::App("index.html".into()))
        .title("StickyNotes — Manager")
        .inner_size(520.0, 600.0)
        .min_inner_size(400.0, 400.0)
        .center()
        .decorations(true)
        .resizable(true)
        .build()?;

    Ok(())
}

/// Open a sticky note window. Frameless, transparent, always-on-top if pinned.
pub fn open_note_window(app: &AppHandle, note: &Note) -> Result<(), Box<dyn std::error::Error>> {
    let label = format!("note-{}", note.id);

    // If the window already exists, just focus it
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus()?;
        return Ok(());
    }

    let url = format!("note.html?id={}", note.id);

    let mut builder =
        WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
            .title(&note.title)
            .inner_size(note.width as f64, note.height as f64)
            .position(note.pos_x as f64, note.pos_y as f64)
            .decorations(false) // Frameless — key for sticky note look
            .transparent(true) // Allow CSS rounded corners / shadows
            .resizable(true)
            .skip_taskbar(true) // Don't clutter the taskbar with note windows
            .visible(true);

    // Pin to top if the note is marked as pinned
    if note.pinned {
        builder = builder.always_on_top(true);
    }

    builder.build()?;

    Ok(())
}

/// Open the settings window (modal-like).
pub fn open_settings_window(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("settings") {
        window.set_focus()?;
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
        .title("StickyNotes — Settings")
        .inner_size(450.0, 500.0)
        .center()
        .decorations(true)
        .resizable(false)
        .build()?;

    Ok(())
}
