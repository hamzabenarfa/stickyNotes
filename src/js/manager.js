/**
 * StickyNotes — Manager Window Logic
 *
 * Handles note listing, search, creation, and opening note windows
 * via Tauri IPC commands.
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

// ─── State ──────────────────────────────────────────────────────

let allNotes = [];
let currentView = 'grid'; // 'grid' | 'list'

// ─── DOM References ─────────────────────────────────────────────

const notesList = document.getElementById('notes-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const notesCount = document.getElementById('notes-count');
const btnNewNote = document.getElementById('btn-new-note');
const btnSettings = document.getElementById('btn-settings');
const btnMinimize = document.getElementById('titlebar-minimize');
const btnClose = document.getElementById('titlebar-close');

// Bottom Nav Buttons
const btnViewGrid = document.querySelector('button .material-icons-round[data-icon="grid_view"]')?.closest('button') || document.querySelectorAll('nav button')[0];
const btnViewList = document.querySelector('button .material-icons-round[data-icon="format_list_bulleted"]')?.closest('button') || document.querySelectorAll('nav button')[1];

// ─── Rendering ──────────────────────────────────────────────────

/**
 * Strip HTML tags for preview text.
 */
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Format a date string to a human-readable relative or short format.
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Render the notes list, filtering by the current search query.
 */
function renderNotes(searchQuery = '') {
  const query = searchQuery.toLowerCase().trim();
  const filtered = allNotes.filter(note => {
    if (!query) return true;
    const title = (note.title || 'Untitled').toLowerCase();
    const text = stripHtml(note.content).toLowerCase();
    return title.includes(query) || text.includes(query);
  });

  // Update count
  notesCount.textContent = `${filtered.length} note${filtered.length !== 1 ? 's' : ''}`;

  // Clear previous cards (keep empty state element)
  const existingCards = notesList.querySelectorAll('.note-card');
  existingCards.forEach(card => card.remove());

  // Show/hide empty state
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    // Ensure height for empty state
    notesList.classList.remove('columns-2');
    notesList.classList.add('flex', 'flex-col');
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    // Update container layout based on currentView
    if (currentView === 'grid') {
      notesList.classList.remove('flex', 'flex-col', 'space-y-3');
      notesList.classList.add('grid', 'grid-cols-2', 'gap-4', 'auto-rows-max');
    } else {
      notesList.classList.remove('grid', 'grid-cols-2', 'gap-4', 'auto-rows-max');
      notesList.classList.add('flex', 'flex-col', 'space-y-3');
    }
  }

  // Render cards
  filtered.forEach((note, i) => {
    const card = document.createElement('div');
    
    // Common classes
    let classes = `note-card relative group rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer`;
    
    if (currentView === 'grid') {
      classes += ` p-4 h-full`;
    } else {
      classes += ` p-4 w-full flex flex-col justify-center min-h-[80px]`;
    }

    // Map colors to Stitch Tailwind classes
    const colorMap = {
      yellow: 'bg-note-yellow text-yellow-900',
      blue: 'bg-note-blue text-blue-900',
      green: 'bg-note-green text-green-900',
      pink: 'bg-note-pink text-pink-900',
      purple: 'bg-note-purple text-purple-900',
      gray: 'bg-neutral-100 text-neutral-900'
    };
    const colorClass = colorMap[note.color] || colorMap.yellow;
    classes += ` ${colorClass}`;
    
    card.className = classes;
    card.style.animationDelay = `${i * 40}ms`;
    card.dataset.id = note.id;

    const preview = stripHtml(note.content).slice(0, 80) || 'Empty note';
    const title = note.title || 'Untitled';
    const time = formatDate(note.updated_at);
    
    // Determine icon color based on note color for contrast
    const btnColorClass = note.color === 'gray' ? 'text-neutral-400 hover:text-red-500' : 'text-neutral-600/40 hover:text-red-600';

    if (currentView === 'grid') {
      card.innerHTML = `
        <button class="absolute top-3 right-3 ${btnColorClass} transition-colors z-10 p-1 opacity-0 group-hover:opacity-100" data-action="delete" data-id="${note.id}" title="Delete note">
          <span class="material-icons-round text-lg">delete_outline</span>
        </button>
        <h3 class="font-bold mb-2 pr-2 text-lg leading-tight line-clamp-1">${escapeHtml(title)}</h3>
        <p class="text-sm opacity-90 leading-relaxed line-clamp-4 min-h-[1.5rem]">${escapeHtml(preview)}</p>
        <div class="mt-4 text-[10px] font-bold opacity-60 uppercase tracking-wider flex items-center gap-1">
          <span>${time}</span>
        </div>
      `;
    } else {
      // List view content
      card.innerHTML = `
        <div class="flex items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-base leading-tight line-clamp-1 mb-1">${escapeHtml(title)}</h3>
                <p class="text-xs opacity-80 leading-relaxed line-clamp-1">${escapeHtml(preview)}</p>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="text-[10px] font-bold opacity-50 uppercase tracking-wider">${time}</span>
                <button class="${btnColorClass} transition-colors p-1 opacity-0 group-hover:opacity-100" data-action="delete" data-id="${note.id}" title="Delete note">
                    <span class="material-icons-round text-lg">delete_outline</span>
                </button>
            </div>
        </div>
      `;
    }

    notesList.appendChild(card);
  });
  
  updateViewButtons();
}

/**
 * Update the visual state of the view toggle buttons.
 */
function updateViewButtons() {
    const activeClass = ['text-primary', 'dark:text-white'];
    const inactiveClass = ['text-neutral-400'];

    const iconGrid = btnViewGrid.querySelector('.material-icons-round');
    const textGrid = btnViewGrid.querySelector('span:not(.material-icons-round)');
    
    const iconList = btnViewList.querySelector('.material-icons-round');
    const textList = btnViewList.querySelector('span:not(.material-icons-round)');

    if (currentView === 'grid') {
        iconGrid.classList.remove(...inactiveClass);
        iconGrid.classList.add(...activeClass);
        textGrid.classList.remove(...inactiveClass);
        textGrid.classList.add(...activeClass);

        iconList.classList.add(...inactiveClass);
        iconList.classList.remove(...activeClass);
        textList.classList.add(...inactiveClass);
        textList.classList.remove(...activeClass);
    } else {
        iconGrid.classList.add(...inactiveClass);
        iconGrid.classList.remove(...activeClass);
        textGrid.classList.add(...inactiveClass);
        textGrid.classList.remove(...activeClass);

        iconList.classList.remove(...inactiveClass);
        iconList.classList.add(...activeClass);
        textList.classList.remove(...inactiveClass);
        textList.classList.add(...activeClass);
    }
}

/**
 * Simple HTML escaping.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Data Loading ───────────────────────────────────────────────

async function loadNotes() {
  try {
    allNotes = await invoke('get_notes');
    renderNotes(searchInput.value);
  } catch (err) {
    console.error('Failed to load notes:', err);
  }
}

// ─── Event Handlers ─────────────────────────────────────────────

// View Toggles
btnViewGrid.addEventListener('click', () => {
    if (currentView !== 'grid') {
        currentView = 'grid';
        renderNotes(searchInput.value);
    }
});

btnViewList.addEventListener('click', () => {
    if (currentView !== 'list') {
        currentView = 'list';
        renderNotes(searchInput.value);
    }
});

// Search
searchInput.addEventListener('input', () => {
  renderNotes(searchInput.value);
});

// New note
btnNewNote.addEventListener('click', async () => {
  try {
    const note = await invoke('create_note', { color: null });
    await invoke('cmd_open_note_window', { id: note.id });
    await loadNotes();
  } catch (err) {
    console.error('Failed to create note:', err);
  }
});

// Settings
btnSettings.addEventListener('click', async () => {
  try {
    await invoke('cmd_open_settings');
  } catch (err) {
    console.error('Failed to open settings:', err);
  }
});

// Window Controls
if (btnMinimize) {
  btnMinimize.addEventListener('click', () => {
    appWindow.minimize();
  });
}

if (btnClose) {
  btnClose.addEventListener('click', () => {
    appWindow.close();
  });
}

// Note card clicks (delegation)
notesList.addEventListener('click', async (e) => {
  // Delete button
  const deleteBtn = e.target.closest('[data-action="delete"]');
  if (deleteBtn) {
    e.stopPropagation();
    const id = deleteBtn.dataset.id;
    try {
      await invoke('cmd_close_note_window', { id });
      await invoke('delete_note', { id });
      await loadNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
    return;
  }

  // Open note window
  const card = e.target.closest('.note-card');
  if (card) {
    try {
      await invoke('cmd_open_note_window', { id: card.dataset.id });
    } catch (err) {
      console.error('Failed to open note:', err);
    }
  }
});

// Refresh notes when manager window regains focus
window.addEventListener('focus', loadNotes);

// ─── Initialize ─────────────────────────────────────────────────

loadNotes();
