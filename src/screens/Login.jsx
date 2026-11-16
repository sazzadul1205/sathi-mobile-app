import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Heart, Plus } from "lucide-react"
import { useSession } from "../store/session.js"
import { createProfile, listProfiles } from "../lib/repo/app.js"
import { Button, Field, TextInput } from "../components/ui.jsx"

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useSession()
  const [profiles, setProfiles] = useState([])
  const [mode, setMode] = useState("choose")
  const [form, setForm] = useState({ name: "", email: "" })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    listProfiles()
      .then((result) => { if (!cancelled) setProfiles(result) })
      .catch(() => { if (!cancelled) setProfiles([]) })
    return () => { cancelled = true }
  }, [])

  async function handleContinue(profile) {
    await signIn(profile)
    navigate("/select", { replace: true })
  }

  async function handleCreate(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const profile = await createProfile(form)
      await signIn(profile)
      navigate("/select", { replace: true })
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-6 mx-auto grid size-16 place-items-center rounded-2xl bg-linear-to-br from-brand-gradient-from to-brand-gradient-to text-white shadow-2">
          <Heart className="size-7" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight">Welcome to Sathi</h1>
        <p className="mx-auto mt-2 mb-8 max-w-64 text-center text-sm leading-relaxed text-muted">
          Coordinate medication, inventory, purchases and transport for a shared care plan
        </p>

        {mode === "choose" ? (
          <>
            {profiles.length > 0 ? (
              <div className="mb-4 space-y-2">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleContinue(profile)}
                    className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-3.5 text-left shadow-1 transition-colors hover:bg-app"
                  >
                    <span className="grid size-10 flex-none place-items-center rounded-xl bg-brand text-sm font-extrabold text-white">
                      {initials(profile.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{profile.name}</span>
                      <span className="block truncate text-xs text-muted">{profile.email}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-dashed border-line bg-app px-4 py-3 text-center text-xs leading-relaxed text-muted">
                No device profile yet. Create one — it stays on this device and needs no internet connection.
              </div>
            )}
            <Button type="button" onClick={() => setMode("create")}>
              <Plus className="size-4" /> New device profile
            </Button>
            <div className="mt-3 text-center">
              <Link to="/recover" className="text-xs font-semibold text-brand">Forgot password / recover account</Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="rounded-lg border border-line bg-card p-4 shadow-1">
            <Field label="Full name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rafiq Ahmed" required autoFocus />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
            </Field>
            {error ? <p className="mb-3 text-xs font-semibold text-missed">{error}</p> : null}
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create profile"}</Button>
            <Button type="button" variant="secondary" className="mt-2" onClick={() => { setMode("choose"); setError(null) }}>Back</Button>
          </form>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted">
          Sathi runs standalone on this device. When care-coordination servers are connected, sign-in will use your verified account.
        </p>
      </div>
    </div>
  )
}

function initials(name) {
  return String(name || "?").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}
