// src/app/App.jsx
// Root: session bootstrap, route table, plan guards (SRS §4: switching plans
// changes every page's context; there is no "all plans" view).

import { useEffect, useMemo } from 'react'
import {
  Navigate,
  Outlet,
  RouterProvider,
  createHashRouter,
} from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useSession } from '../store/session.js'
import { usePlans } from '../store/plan.js'
import { TabBar } from '../components/ui.jsx'
import Login from '../screens/Login.jsx'
import PlanSelector from '../screens/PlanSelector.jsx'
import CreatePlan from '../screens/CreatePlan.jsx'
import Dashboard from '../screens/Dashboard.jsx'
import Medicines from '../screens/Medicines.jsx'
import MedicineForm from '../screens/MedicineForm.jsx'
import Schedule from '../screens/Schedule.jsx'
import Settings from '../screens/Settings.jsx'

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-white">
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

function PlanLayout() {
  const currentPlanId = usePlans((s) => s.currentPlanId)
  const context = usePlans((s) => s.context)
  if (!currentPlanId || !context) return <Navigate to="/select" replace />
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-2 pb-4">
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
                { path: 'settings', element: <Settings /> },
              ],
            },
            { path: '*', element: <HomeRedirect /> },
          ],
        },
      ]),
    [],
  )
  return <RouterProvider router={router} />
}