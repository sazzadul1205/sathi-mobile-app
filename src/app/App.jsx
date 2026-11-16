import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Navigate,
  Outlet,
  RouterProvider,
  createHashRouter,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Heart, Loader2 } from 'lucide-react'
import { useSession } from '../store/session.js'
import { usePlans } from '../store/plan.js'
import { TabBar } from '../components/ui.jsx'
import Login from '../screens/Login.jsx'

const AccountRecovery = lazy(() => import('../screens/AccountRecovery.jsx'))
const PlanSelector = lazy(() => import('../screens/PlanSelector.jsx'))
const CreatePlan = lazy(() => import('../screens/CreatePlan.jsx'))
const Dashboard = lazy(() => import('../screens/Dashboard.jsx'))
const Medicines = lazy(() => import('../screens/Medicines.jsx'))
const MedicineForm = lazy(() => import('../screens/MedicineForm.jsx'))
const Schedule = lazy(() => import('../screens/Schedule.jsx'))
const Settings = lazy(() => import('../screens/Settings.jsx'))
const PatientProfile = lazy(() => import('../screens/PatientProfile.jsx'))
const Members = lazy(() => import('../screens/Members.jsx'))
const Inventory = lazy(() => import('../screens/Inventory.jsx'))
const StockReceipt = lazy(() => import('../screens/StockReceipt.jsx'))
const StockAdjust = lazy(() => import('../screens/StockAdjust.jsx'))
const Purchases = lazy(() => import('../screens/Purchases.jsx'))
const PurchaseDetails = lazy(() => import('../screens/PurchaseDetails.jsx'))
const Transfers = lazy(() => import('../screens/Transfers.jsx'))
const Notifications = lazy(() => import('../screens/Notifications.jsx'))
const NotificationPreferences = lazy(() => import('../screens/NotificationPreferences.jsx'))
const SyncStatus = lazy(() => import('../screens/SyncStatus.jsx'))
const AuditHistory = lazy(() => import('../screens/AuditHistory.jsx'))

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-brand-gradient-from to-brand-gradient-to text-white">
          <Heart className="size-6" />
        </span>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  )
}

function Root() {
  const status = useSession((s) => s.status)
  const bootstrap = useSession((s) => s.bootstrap)
  const planStatus = usePlans((s) => s.status)
  const loadPlans = usePlans((s) => s.loadPlans)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (status === 'signed-in' && planStatus === 'loading') loadPlans()
  }, [status, planStatus, loadPlans])

  if (status === 'loading') return <Splash />
  return <Outlet />
}

function HomeRedirect() {
  const status = useSession((s) => s.status)
  const currentPlanId = usePlans((s) => s.currentPlanId)
  if (status === 'signed-out') return <Navigate to="/login" replace />
  if (!currentPlanId) return <Navigate to="/select" replace />
  return <Navigate to="/plan" replace />
}

const TAB_PATHS = ['/plan', '/plan/schedule', '/plan/meds', '/plan/settings']

function PlanLayout() {
  const currentPlanId = usePlans((s) => s.currentPlanId)
  const context = usePlans((s) => s.context)
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef(null)
  const touchRef = useRef(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  if (!currentPlanId || !context) return <Navigate to="/select" replace />

  const onTouchStart = (e) => {
    if (refreshing) return
    const t = e.touches[0]
    const atTop = (mainRef.current?.scrollTop ?? window.scrollY ?? 0) <= 0
    touchRef.current = { x: t.clientX, y: t.clientY, atTop, mode: null }
  }

  const onTouchMove = (e) => {
    const s = touchRef.current
    if (!s || refreshing) return
    const t = e.touches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (!s.mode) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      s.mode = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (s.mode === 'y' && s.atTop && dy > 0) {
      setPull(Math.min(dy * 0.45, 90))
    }
  }

  const onTouchEnd = (e) => {
    const s = touchRef.current
    touchRef.current = null
    if (!s || refreshing) {
      setPull(0)
      return
    }
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    const idx = TAB_PATHS.indexOf(location.pathname)

    if (s.mode === 'x' && idx !== -1 && Math.abs(dx) > 60 && Math.abs(dy) < 80) {
      if (dx < 0 && idx < TAB_PATHS.length - 1) navigate(TAB_PATHS[idx + 1])
      if (dx > 0 && idx > 0) navigate(TAB_PATHS[idx - 1])
    }

    if (s.mode === 'y' && s.atTop && dy > 70) {
      setRefreshing(true)
      setPull(56)
      setTimeout(() => window.location.reload(), 350)
      return
    }
    setPull(0)
  }

  const indicatorH = refreshing ? 56 : pull

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className="flex items-end justify-center overflow-hidden bg-app text-brand transition-[height] duration-150"
        style={{ height: indicatorH }}
        aria-hidden="true"
      >
        {(indicatorH > 12 || refreshing) && (
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <Loader2 className={`size-4 ${refreshing || pull > 60 ? 'animate-spin' : ''}`} />
            <span>{refreshing || pull > 60 ? 'Refreshing…' : 'Pull to refresh'}</span>
          </div>
        )}
      </div>
      <main
        ref={mainRef}
        className="mx-auto w-full max-w-md flex-1 px-4 pt-2 pb-4"
        style={{ touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touchRef.current = null; setPull(0) }}
      >
        <Outlet />
      </main>
      <div className="mx-auto w-full max-w-md">
        <TabBar />
      </div>
    </div>
  )
}

export default function App() {
  const router = useMemo(
    () =>
      createHashRouter([
        {
          path: '/',
          element: <Root />,
          children: [
            { index: true, element: <HomeRedirect /> },
            { path: 'login', element: <Login /> },
            { path: 'recover', element: <AccountRecovery /> },
            { path: 'select', element: <PlanSelector /> },
            { path: 'plans/new', element: <CreatePlan /> },
            {
              path: 'plan',
              element: <PlanLayout />,
              children: [
                { index: true, element: <Dashboard /> },
                { path: 'meds', element: <Medicines /> },
                { path: 'meds/new', element: <MedicineForm /> },
                { path: 'meds/:medicineId', element: <MedicineForm /> },
                { path: 'schedule', element: <Schedule /> },
                { path: 'patient', element: <PatientProfile /> },
                { path: 'members', element: <Members /> },
                { path: 'inventory', element: <Inventory /> },
                { path: 'inventory/receipt', element: <StockReceipt /> },
                { path: 'inventory/adjust', element: <StockAdjust /> },
                { path: 'purchases', element: <Purchases /> },
                { path: 'purchases/:purchaseId', element: <PurchaseDetails /> },
                { path: 'transfers', element: <Transfers /> },
                { path: 'notifications', element: <Notifications /> },
                { path: 'notification-preferences', element: <NotificationPreferences /> },
                { path: 'sync', element: <SyncStatus /> },
                { path: 'audit', element: <AuditHistory /> },
                { path: 'settings', element: <Settings /> },
              ],
            },
            { path: '*', element: <HomeRedirect /> },
          ],
        },
      ]),
    [],
  )
  return (
    <Suspense fallback={<Splash />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
