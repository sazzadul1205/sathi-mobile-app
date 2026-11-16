/* eslint-disable no-undef */
// Firebase Cloud Messaging background handler (web push).
// Replace the placeholder config with your Firebase web app config or generate
// this file during deploy from environment variables.
importScripts("https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js")

const firebaseConfig = {
  apiKey: self.__FIREBASE_API_KEY__ || "REPLACE_ME",
  authDomain: self.__FIREBASE_AUTH_DOMAIN__ || "REPLACE_ME",
  projectId: self.__FIREBASE_PROJECT_ID__ || "REPLACE_ME",
  storageBucket: self.__FIREBASE_STORAGE_BUCKET__ || "REPLACE_ME",
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || "REPLACE_ME",
  appId: self.__FIREBASE_APP_ID__ || "REPLACE_ME",
}

try {
  if (firebaseConfig.apiKey !== "REPLACE_ME") {
    firebase.initializeApp(firebaseConfig)
    const messaging = firebase.messaging()
    messaging.onBackgroundMessage((payload) => {
      const title = payload?.notification?.title || payload?.data?.title || "Sathi notification"
      const body = payload?.notification?.body || payload?.data?.body || ""
      const options = {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: payload?.data || {},
      }
      self.registration.showNotification(title, options)
    })
  }
} catch {
  // Swallow to avoid breaking SW registration when not configured.
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow("/#/plan/notifications")
      return undefined
    }),
  )
})
