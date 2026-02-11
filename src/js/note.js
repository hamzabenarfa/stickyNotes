/**
 * StickyNotes — Note Window Logic
 *
 * Initializes Tiptap editor, loads/saves note content,
 * handles color switching, and window controls.
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

// ─── State ──────────────────────────────────────────────────────

let noteId = null;
let currentColor = 'yellow';
let editor = null;
let saveTimeout = null;

const COLORS = ['yellow', 'blue', 'green', 'pink'];

// ─── DOM References ─────────────────────────────────────────────

const noteContainer = document.getElementById('note-container');
const colorPicker = document.getElementById('color-picker');
const noteTitleDisplay = document.getElementById('note-title-display');

// Buttons
const btnNew = document.getElementById('btn-new');
// btnPin removed
const btnColor = document.getElementById('btn-color');
const btnManager = document.getElementById('btn-manager');
const btnClose = document.getElementById('btn-close');

// Toolbar
const tbBold = document.getElementById('tb-bold');
const tbItalic = document.getElementById('tb-italic');
const tbUnderline = document.getElementById('tb-underline');
const tbStrike = document.getElementById('tb-strike');
const tbBullet = document.getElementById('tb-bullet');
const tbOrdered = document.getElementById('tb-ordered');

// ─── Extract note ID from URL ───────────────────────────────────

function getNoteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ─── Editor Setup ───────────────────────────────────────────────

function initEditor(content = '') {

  editor = new Editor({
    element: document.getElementById('editor'),
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start typing your note...',
      }),
    ],
    content: content || '',
    autofocus: true,
    onUpdate: () => {
      debouncedSave();
      updateToolbarState();
    },
    onSelectionUpdate: () => {
      updateToolbarState();
    },
  });
}

// ─── Toolbar State ──────────────────────────────────────────────

function updateToolbarState() {
  if (!editor) return;

  tbBold.classList.toggle('active', editor.isActive('bold'));
  tbItalic.classList.toggle('active', editor.isActive('italic'));
  tbUnderline.classList.toggle('active', editor.isActive('underline'));
  tbStrike.classList.toggle('active', editor.isActive('strike'));
  tbBullet.classList.toggle('active', editor.isActive('bulletList'));
  tbOrdered.classList.toggle('active', editor.isActive('orderedList'));
}

// ─── Auto-Save (debounced) ──────────────────────────────────────

function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNote, 500);
}

async function saveNote() {
  if (!noteId || !editor) return;

  const html = editor.getHTML();
  // Extract a title from first line of text
  const text = editor.getText();
  const firstLine = text.split('\n')[0]?.trim() || '';
  const title = firstLine.slice(0, 60) || 'Untitled';

  try {
    await invoke('update_note', {
      id: noteId,
      update: {
        content: html,
        title,
      },
    });
    noteTitleDisplay.textContent = title;
  } catch (err) {
    console.error('Failed to save note:', err);
  }
}

// ─── Color Handling ─────────────────────────────────────────────

function applyColor(color) {
  currentColor = color;
  noteContainer.className = `note note--${color}`;

  // Mark active swatch
  document.querySelectorAll('.color-picker__swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === color);
  });
}

async function changeColor(color) {
  applyColor(color);
  colorPicker.classList.remove('active');

  if (!noteId) return;
  try {
    await invoke('update_note', {
      id: noteId,
      update: { color },
    });
  } catch (err) {
    console.error('Failed to update color:', err);
  }
}

// ─── Window Position/Size Tracking ──────────────────────────────

let positionSaveTimeout = null;

async function saveWindowGeometry() {
  if (!noteId) return;
  try {
    const win = getCurrentWebviewWindow();
    const pos = await win.outerPosition();
    const size = await win.outerSize();

    await invoke('update_note', {
      id: noteId,
      update: {
        pos_x: Math.round(pos.x),
        pos_y: Math.round(pos.y),
        width: Math.round(size.width),
        height: Math.round(size.height),
      },
    });
  } catch (err) {
    // Silently fail — this is best-effort
  }
}

function debouncedSaveGeometry() {
  clearTimeout(positionSaveTimeout);
  positionSaveTimeout = setTimeout(saveWindowGeometry, 1000);
}

// ─── Event Listeners ────────────────────────────────────────────

// Toolbar buttons
tbBold.addEventListener('click', () => editor?.chain().focus().toggleBold().run());
tbItalic.addEventListener('click', () => editor?.chain().focus().toggleItalic().run());
tbUnderline.addEventListener('click', () => editor?.chain().focus().toggleUnderline().run());
tbStrike.addEventListener('click', () => editor?.chain().focus().toggleStrike().run());
tbBullet.addEventListener('click', () => editor?.chain().focus().toggleBulletList().run());
tbOrdered.addEventListener('click', () => editor?.chain().focus().toggleOrderedList().run());

// Color picker toggle
btnColor.addEventListener('click', (e) => {
  e.stopPropagation();
  colorPicker.classList.toggle('active');
});

// Color swatches
document.querySelectorAll('.color-picker__swatch').forEach(swatch => {
  swatch.addEventListener('click', () => changeColor(swatch.dataset.color));
});

// Close color picker when clicking elsewhere
document.addEventListener('click', (e) => {
  if (!colorPicker.contains(e.target) && e.target !== btnColor) {
    colorPicker.classList.remove('active');
  }
});

// New note
btnNew.addEventListener('click', async () => {
  try {
    const note = await invoke('create_note', { color: null });
    await invoke('cmd_open_note_window', { id: note.id });
  } catch (err) {
    console.error('Failed to create note:', err);
  }
});

// Pin toggle removed

// Open Manager
btnManager.addEventListener('click', async () => {
  try {
    await invoke('cmd_open_manager');
  } catch (err) {
    console.error('Failed to open manager:', err);
  }
});

// Close note (mark as closed, close window)
btnClose.addEventListener('click', async () => {
  if (noteId) {
    clearTimeout(saveTimeout);
    await saveNote();
    try {
      await invoke('update_note', {
        id: noteId,
        update: { is_open: false },
      });
    } catch (err) {
      console.error('Failed to mark note as closed:', err);
    }
  }
  try {
    const win = getCurrentWebviewWindow();
    await win.close();
  } catch (err) {
    console.error('Failed to close window:', err);
  }
});

// Track window move/resize
window.addEventListener('resize', debouncedSaveGeometry);

// ─── Initialize ─────────────────────────────────────────────────

async function init() {
  noteId = getNoteIdFromUrl();
  if (!noteId) {
    console.error('No note ID in URL');
    return;
  }

  try {
    const note = await invoke('get_note', { id: noteId });

    // Apply color
    applyColor(note.color);

    // Set title
    noteTitleDisplay.textContent = note.title || 'Untitled';

    // Pin button removed

    // Initialize editor with content
    initEditor(note.content);
  } catch (err) {
    console.error('Failed to load note:', err);
    initEditor('');
  }
}

init();
