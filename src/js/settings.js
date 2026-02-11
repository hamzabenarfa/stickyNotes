/**
 * StickyNotes — Settings Window Logic
 *
 * Loads and saves settings via Tauri IPC commands.
 */

import { invoke } from '@tauri-apps/api/core';

// ─── DOM References ─────────────────────────────────────────────

const settingBackend = document.getElementById('setting-backend');
const settingUiScale = document.getElementById('setting-ui-scale');
const settingUiScaleValue = document.getElementById('setting-ui-scale-value');
const settingDbPath = document.getElementById('setting-db-path');
const btnBrowseDb = document.getElementById('btn-browse-db');
const settingColorPalette = document.getElementById('setting-color-palette');

// ─── Load Settings ──────────────────────────────────────────────

async function loadSettings() {
  try {
    const settings = await invoke('get_all_settings');
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });

    // Backend
    if (map.backend) {
      settingBackend.value = map.backend;
    }

    // UI Scale
    if (map.ui_scale) {
      settingUiScale.value = map.ui_scale;
      settingUiScaleValue.textContent = map.ui_scale;
    }

    // DB Path
    if (map.db_path) {
      settingDbPath.value = map.db_path || 'Default location';
    }

    // Color Palette
    if (map.color_palette) {
      settingColorPalette.value = map.color_palette;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// ─── Save Setting Helper ────────────────────────────────────────

async function saveSetting(key, value) {
  try {
    await invoke('set_setting', { key, value });
  } catch (err) {
    console.error(`Failed to save setting "${key}":`, err);
  }
}

// ─── Event Listeners ────────────────────────────────────────────

// Backend select
settingBackend.addEventListener('change', () => {
  saveSetting('backend', settingBackend.value);
});

// UI Scale slider
settingUiScale.addEventListener('input', () => {
  const val = parseFloat(settingUiScale.value).toFixed(1);
  settingUiScaleValue.textContent = val;
  saveSetting('ui_scale', val);
});

// Color Palette select
settingColorPalette.addEventListener('change', () => {
  saveSetting('color_palette', settingColorPalette.value);
});

// Browse DB path (placeholder — full file dialog requires tauri-plugin-dialog)
btnBrowseDb.addEventListener('click', () => {
  // In production, use tauri-plugin-dialog for a native file chooser.
  // For now, just show a helpful message.
  alert('To change the database path, edit the setting manually in the database file, or install the tauri-plugin-dialog for native file selection.');
});

// ─── Initialize ─────────────────────────────────────────────────

loadSettings();
