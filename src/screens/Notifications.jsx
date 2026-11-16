import { useCallback, useEffect, useState } from 'react'
import { getPlanDb, usePlans } from '../store/plan.js'
import { useSession } from '../store/session.js'
import { listNotifications, markNotificationRead, seedDefaultNotifications } from '../lib/repo/notifications.js'
import { Button, Card, Loading, ScreenHeader, StatusPill } from '../components/ui.jsx'

export default function Notifications() {
  const { currentPlanId } = usePlans()
  const { profile } = useSession()
  const [items, setItems] = useState(null)

  const load = useCallback(async () => {
    if (!currentPlanId) return
    const db = await getPlanDb(currentPlanId)
    await seedDefaultNotifications(db, { planId: currentPlanId, recordedBy: profile?.id || 'device' })
    setItems(await listNotifications(db))
  }, [currentPlanId, profile])
  useEffect(() => { load() }, [load])

  async function toggleRead(id, read) {
    const db = await getPlanDb(currentPlanId)
    await markNotificationRead(db, id, read)
    await load()
  }

  if (!items) return <Loading />
  return (
    <div>
      <ScreenHeader title="Notifications & activity" subtitle={`${items.filter(i=>!i.read).length} unread`} backTo />
      <div className="space-y-2">
        {items.map((n) => (
          <Card key={n.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="text-sm font-bold">{n.title}</div><div className="mt-0.5 text-xs leading-relaxed text-muted">{n.body}</div></div>
              <StatusPill tone={n.read ? 'ok' : 'pending'}>{n.category}</StatusPill>
            </div>
            <div className="mt-2"><Button type="button" variant="secondary" size="sm" onClick={() => toggleRead(n.id, !n.read)}>{n.read ? 'Mark unread' : 'Mark read'}</Button></div>
          </Card>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">Sensitive details must not appear in notification previews (SR-12). Delivery does not imply action.</p>
    </div>
  )
}
