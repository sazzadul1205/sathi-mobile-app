import { initializeApp, getApps } from "firebase/app"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  )
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null
  return getApps()[0] || initializeApp(firebaseConfig)
}

async function loadMessagingApi() {
  if (typeof window === "undefined") return null
  const app = getFirebaseApp()
  if (!app) return null
  try {
    const mod = await import("firebase/messaging")
    const supported = await mod.isSupported().catch(() => false)
    if (!supported) return null
    return { ...mod, app }
  } catch {
    return null
  }
}

export async function getFirebaseMessaging() {
  const api = await loadMessagingApi()
  if (!api) return null
  try {
    return api.getMessaging(api.app)
  } catch {
    return null
  }
}

export async function getFcmToken(serviceWorkerRegistration) {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return null
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) return null
  try {
    const { getToken } = await import("firebase/messaging")
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration })
  } catch {
    return null
  }
}

export async function subscribeForegroundMessages(handler) {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return () => {}
  try {
    const { onMessage } = await import("firebase/messaging")
    return onMessage(messaging, handler)
  } catch {
    return () => {}
  }
}
