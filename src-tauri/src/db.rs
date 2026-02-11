use rusqlite::{params, Connection, Result as SqlResult};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

use crate::models::{Note, NoteUpdate, Setting};

/// Thread-safe wrapper around the SQLite connection.
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Initialize the database at the given path, running migrations.
    pub fn init(app_data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        fs::create_dir_all(&app_data_dir)?;
        let db_path = app_data_dir.join("stickynotes.db");
        let conn = Connection::open(&db_path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        // Run migrations
        let migration = include_str!("../migrations/001_init.sql");
        conn.execute_batch(migration)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    // ─── Notes CRUD ──────────────────────────────────────────────

    /// Retrieve all notes, ordered by most recently updated.
    pub fn get_all_notes(&self) -> SqlResult<Vec<Note>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, content, color, pos_x, pos_y, width, height,
                    is_open, pinned, created_at, updated_at
             FROM notes ORDER BY updated_at DESC",
        )?;

        let notes = stmt
            .query_map([], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    color: row.get(3)?,
                    pos_x: row.get(4)?,
                    pos_y: row.get(5)?,
                    width: row.get(6)?,
                    height: row.get(7)?,
                    is_open: row.get::<_, i32>(8)? != 0,
                    pinned: row.get::<_, i32>(9)? != 0,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;

        Ok(notes)
    }

    /// Retrieve a single note by ID.
    pub fn get_note(&self, id: &str) -> SqlResult<Note> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT id, title, content, color, pos_x, pos_y, width, height,
                    is_open, pinned, created_at, updated_at
             FROM notes WHERE id = ?1",
            params![id],
            |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    color: row.get(3)?,
                    pos_x: row.get(4)?,
                    pos_y: row.get(5)?,
                    width: row.get(6)?,
                    height: row.get(7)?,
                    is_open: row.get::<_, i32>(8)? != 0,
                    pinned: row.get::<_, i32>(9)? != 0,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        )
    }

    /// Create a new note with defaults and return it.
    pub fn create_note(&self, color: Option<String>) -> SqlResult<Note> {
        let id = Uuid::new_v4().to_string();
        let note_color = color.unwrap_or_else(|| "yellow".to_string());
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO notes (id, color) VALUES (?1, ?2)",
            params![id, note_color],
        )?;

        drop(conn);
        self.get_note(&id)
    }

    /// Partially update a note. Only provided fields are modified.
    pub fn update_note(&self, id: &str, update: NoteUpdate) -> SqlResult<Note> {
        let conn = self.conn.lock().unwrap();
        let mut set_clauses = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref title) = update.title {
            set_clauses.push("title = ?");
            values.push(Box::new(title.clone()));
        }
        if let Some(ref content) = update.content {
            set_clauses.push("content = ?");
            values.push(Box::new(content.clone()));
        }
        if let Some(ref color) = update.color {
            set_clauses.push("color = ?");
            values.push(Box::new(color.clone()));
        }
        if let Some(pos_x) = update.pos_x {
            set_clauses.push("pos_x = ?");
            values.push(Box::new(pos_x));
        }
        if let Some(pos_y) = update.pos_y {
            set_clauses.push("pos_y = ?");
            values.push(Box::new(pos_y));
        }
        if let Some(width) = update.width {
            set_clauses.push("width = ?");
            values.push(Box::new(width));
        }
        if let Some(height) = update.height {
            set_clauses.push("height = ?");
            values.push(Box::new(height));
        }
        if let Some(is_open) = update.is_open {
            set_clauses.push("is_open = ?");
            values.push(Box::new(is_open as i32));
        }
        if let Some(pinned) = update.pinned {
            set_clauses.push("pinned = ?");
            values.push(Box::new(pinned as i32));
        }

        if !set_clauses.is_empty() {
            set_clauses.push("updated_at = datetime('now')");
            let sql = format!("UPDATE notes SET {} WHERE id = ?", set_clauses.join(", "));
            values.push(Box::new(id.to_string()));

            let params: Vec<&dyn rusqlite::types::ToSql> =
                values.iter().map(|v| v.as_ref()).collect();
            conn.execute(&sql, params.as_slice())?;
        }

        drop(conn);
        self.get_note(id)
    }

    /// Delete a note by ID.
    pub fn delete_note(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ─── Settings ────────────────────────────────────────────────

    /// Get a setting value by key.
    pub fn get_setting(&self, key: &str) -> SqlResult<String> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
    }

    /// Set a setting value.
    pub fn set_setting(&self, key: &str, value: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    /// Get all settings.
    pub fn get_all_settings(&self) -> SqlResult<Vec<Setting>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let settings = stmt
            .query_map([], |row| {
                Ok(Setting {
                    key: row.get(0)?,
                    value: row.get(1)?,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(settings)
    }
}
