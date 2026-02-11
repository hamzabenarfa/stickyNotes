CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT 'yellow',
    pos_x       INTEGER NOT NULL DEFAULT 100,
    pos_y       INTEGER NOT NULL DEFAULT 100,
    width       INTEGER NOT NULL DEFAULT 300,
    height      INTEGER NOT NULL DEFAULT 350,
    is_open     INTEGER NOT NULL DEFAULT 1,
    pinned      INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('backend', 'wayland'),
    ('db_path', ''),
    ('ui_scale', '1.0'),
    ('color_palette', 'pastel');
