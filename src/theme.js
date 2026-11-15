// src/theme.js
// Runtime controller for the modular color template system.
// Themes live in src/styles/themes/*.css and are activated via <html data-theme>.

export const availableThemes = ['teal', 'ocean', 'sage', 'dark']

const STORAGE_KEY = 'sathi-theme'

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setTheme(name) {
  if (!availableThemes.includes(name)) return
  document.documentElement.dataset.theme = name
  try {
    localStorage.setItem(STORAGE_KEY, name)
  } catch {
    // Storage unavailable (private mode etc.) — theme still applies for the session.
  }
}

// Applies the stored theme, falling back to the OS dark-mode preference.
// Call once before rendering the app.
export function initTheme() {
  const stored = getStoredTheme()
  if (stored && availableThemes.includes(stored)) {
    setTheme(stored)
    return
  }
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    setTheme('dark')
  }
}