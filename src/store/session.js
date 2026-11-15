// src/store/session.js
// Device-profile session (standalone mode). The server-backed auth replaces
// this when the backend exists (docs/LOCAL_DATABASE.md §9).
// Offline authorization expires 24 h after sign-in (FR-73/74).

import { create } from 'zustand'
import { getSession, listProfiles, signIn as apiSignIn, signOut as apiSignOut } from '../lib/repo/app.js'

export const useSession = create((set) => ({
  status: 'loading', // loading | signed-out | signed-in
  profile: null,
  session: null,
  error: null,

  async bootstrap() {
    try {
      const session = await getSession()
      if (!session || new Date(session.offlineAuthExpiresAt).getTime() <= Date.now()) {
        await apiSignOut()
        set({ status: 'signed-out', profile: null, session: null })
        return
      }
      const profiles = await listProfiles()
      const profile = profiles.find((p) => p.id === session.profileId) || null
      if (!profile) {
        await apiSignOut()
        set({ status: 'signed-out', profile: null, session: null })
        return
      }
      set({ status: 'signed-in', profile, session })
    } catch (error) {
      set({ status: 'signed-out', error: String(error) })
    }
  },

  async signIn(profile) {
    const session = await apiSignIn(profile.id)
    set({ status: 'signed-in', profile, session, error: null })
  },

  async signOut() {
    await apiSignOut()
    set({ status: 'signed-out', profile: null, session: null, error: null })
  },

  clearError() {
    set({ error: null })
  },
}))