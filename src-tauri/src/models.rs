use serde::{Deserialize, Serialize};

/// Represents a sticky note stored in the database.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub color: String,
    pub pos_x: i32,
    pub pos_y: i32,
    pub width: i32,
    pub height: i32,
    pub is_open: bool,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Partial update payload for a note. All fields are optional.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteUpdate {
    pub title: Option<String>,
    pub content: Option<String>,
    pub color: Option<String>,
    pub pos_x: Option<i32>,
    pub pos_y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub is_open: Option<bool>,
    pub pinned: Option<bool>,
}

/// A key-value setting entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
}
