import { isFirebaseConfigured, getFcmToken, subscribeForegroundMessages } from "./firebase.js"

const TOKEN_KEY = "sathi-fcm-token"
const PREFS_KEY = "sathi-notification-prefs"
const MESSAGING_SW_URL = "/firebase-messaging-sw.js"

const DEFAULT_PREFS = {
  dose: true,
  outcomes: true,
  lowstock: true,
  transfers: true,
  membership: true,
  hidePreview: true,
}

export function getNotificationPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function setNotificationPrefs(next) {
  const value = { ...DEFAULT_PREFS, ...next }
  localStorage.setItem(PREFS_KEY, JSON.stringify(value))
  return value
}

export function getPushCapability() {
  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
  return {
    supported,
    permission: supported ? Notification.permission : "unsupported",
    configured: isFirebaseConfigured(),
  }
}

export async function requestPushPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  try {
    return await Notification.requestPermission()
  } catch {
    return "denied"
  }
}

export async function registerMessagingServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  if (!isFirebaseConfigured()) return null
  try {
    return await navigator.serviceWorker.register(MESSAGING_SW_URL, { scope: "/" })
  } catch {
    return null
  }
}

export async function ensureFcmToken(registration) {
  const reg = registration || (await registerMessagingServiceWorker()) || (await navigator.serviceWorker?.ready?.catch(() => null))
  const token = await getFcmToken(reg || undefined)
  if (token) localStorage.setItem(TOKEN_KEY, token)
  return token
}

export function getStoredFcmToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function showLocalNotification(title, options = {}, registration) {
  if (typeof window === "undefined" || !("Notification" in window)) return false
  if (Notification.permission !== "granted") return false
  const reg = registration || (await navigator.serviceWorker?.getRegistration?.())
  if (reg?.showNotification) {
    await reg.showNotification(title, options)
    return true
  }
  try {
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}

export function bindForegroundPush(handler) {
  return subscribeForegroundMessages(handler)
}
