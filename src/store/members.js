import { create } from 'zustand'
import { getPlanDb, usePlans } from './plan.js'
import { useSession } from './session.js'
import { addMember, listMembers, removeMember, updateMember } from '../lib/repo/members.js'

export const useMembers = create((set, get) => ({
  status: 'idle',
  members: [],
  async load() {
    const planId = usePlans.getState().currentPlanId
    if (!planId) return
    set({ status: 'loading' })
    const db = await getPlanDb(planId)
    const members = await listMembers(db)
    set({ status: 'ready', members })
  },
  async add(data) {
    const { currentPlanId: planId } = usePlans.getState()
    const recordedBy = useSession.getState().profile?.id || 'device'
    const db = await getPlanDb(planId)
    await addMember(db, data, { planId, recordedBy })
    await get().load()
  },
  async update(id, patch) {
    const { currentPlanId: planId } = usePlans.getState()
    const db = await getPlanDb(planId)
    await updateMember(db, id, patch)
    await get().load()
  },
  async remove(id) {
    const { currentPlanId: planId } = usePlans.getState()
    const db = await getPlanDb(planId)
    await removeMember(db, id)
    await get().load()
  },
}))
