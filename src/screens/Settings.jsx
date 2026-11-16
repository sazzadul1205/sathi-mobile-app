import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  Download,
  LogOut,
  MapPin,
  Palette,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
  Users,
  WifiOff,
} from "lucide-react";
import { useSession } from "../store/session.js";
import { usePlans, closeAllPlanDbs } from "../store/plan.js";
import { availableThemes, getStoredTheme, setTheme } from "../theme.js";
import {
  downloadBackup,
  readBackupFile,
  restoreBackup,
} from "../lib/repo/backup.js";
import {
  alertError,
  alertSuccess,
  confirmDialog,
} from "../lib/swal.js";
import { Button, Field, ScreenHeader, Select } from "../components/ui.jsx";

export default function Settings() {
  const navigate = useNavigate();
  const { profile, session, signOut } = useSession();
  const { plans, currentPlanId, deletePlan } = usePlans();
  const [theme, setThemeState] = useState(getStoredTheme() || "teal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const fileInputRef = useRef(null);

  const currentPlan = plans.find((plan) => plan.id === currentPlanId);

  function handleThemeChange(name) {
    setThemeState(name);
    setTheme(name);
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    navigate("/login", { replace: true });
  }

  async function handleDeletePlan() {
    const confirmed = await confirmDialog({
      title: "Delete this plan?",
      text: "This deletes the plan and all its local data on this device. This cannot be undone.",
      confirmButtonText: "Delete plan",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      await deletePlan(currentPlanId);
      navigate("/select", { replace: true });
    } catch (err) {
      setError(String(err.message || err));
      await alertError("Could not delete plan", String(err.message || err));
      setBusy(false);
    }
  }

  async function handleExportBackup() {
    setBackupBusy(true);
    setError(null);
    setBackupMessage(null);
    try {
      await downloadBackup();
      setBackupMessage("Backup downloaded as a JSON file.");
      await alertSuccess("Backup downloaded", "Your backup file has been saved.");
    } catch (err) {
      setError(String(err.message || err));
      await alertError("Backup failed", String(err.message || err));
    } finally {
      setBackupBusy(false);
    }
  }

  function handleRestoreFileChange(event) {
    const file = event.target.files?.[0] || null;
    setRestoreFile(file);
    setConfirmRestore(false);
    setBackupMessage(null);
    setError(null);
  }

  async function handleRestoreBackup() {
    if (!restoreFile) return;
    setBackupBusy(true);
    setError(null);
    setBackupMessage(null);
    try {
      const backup = await readBackupFile(restoreFile);
      await restoreBackup(backup, { closePlanDbs: closeAllPlanDbs });
      setBackupMessage("Backup restored. Reloading app…");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setError(String(err.message || err));
      setBackupBusy(false);
      setConfirmRestore(false);
    }
  }

  const links = [
    { to: "/plan/patient", label: "Patient profile", icon: MapPin },
    { to: "/plan/members", label: "Members & permissions", icon: Users },
    { to: "/plan/inventory", label: "Inventory", icon: ClipboardList },
    { to: "/plan/purchases", label: "Purchases", icon: ShoppingCart },
    { to: "/plan/transfers", label: "Transfers", icon: Truck },
    {
      to: "/plan/notifications",
      label: "Notifications & activity",
      icon: Bell,
    },
    {
      to: "/plan/notification-preferences",
      label: "Notification preferences",
      icon: Bell,
    },
    { to: "/plan/sync", label: "Offline sync status", icon: RefreshCw },
    { to: "/plan/audit", label: "Audit history", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader title="Settings" subtitle={profile?.name} />

        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
          Profile
        </h3>
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-card p-3.5">
          <span className="grid size-11 flex-none place-items-center rounded-xl bg-brand text-sm font-extrabold text-white">
            {initials(profile?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{profile?.name}</div>
            <div className="truncate text-xs text-muted">{profile?.email}</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            disabled={busy}
          >
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </div>

        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          <Palette className="size-3.5" /> Appearance
        </h3>
        <Field label="Theme">
          <Select
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
          >
            {availableThemes.map((name) => (
              <option key={name} value={name}>
                {name[0].toUpperCase() + name.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
          Care plan pages
        </h3>
        <div className="mb-4 space-y-2">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg border border-line bg-card px-3.5 py-3 text-sm font-semibold text-ink hover:bg-app"
            >
              <item.icon className="size-4 text-brand" />
              <span className="flex-1">{item.label}</span>
              <span className="text-muted">›</span>
            </Link>
          ))}
        </div>

        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          <ShieldCheck className="size-3.5" /> Offline authorization
        </h3>
        <div className="mb-4 rounded-lg border border-line bg-card p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold">Signed in since</span>
            <span className="text-muted">
              {session ? new Date(session.signedInAt).toLocaleString() : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold">Sensitive actions expire</span>
            <span className="text-muted">
              {session
                ? new Date(session.offlineAuthExpiresAt).toLocaleString()
                : "—"}
            </span>
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
            <WifiOff className="mt-0.5 size-3.5 flex-none" />
            Recording doses and stock changes needs fresh authorization every 24
            h while offline. Reconnecting renews it.
          </p>
        </div>

        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
          This plan
        </h3>
        <div className="mb-4 rounded-lg border border-line bg-card p-3.5">
          <div className="text-sm font-bold">{currentPlan?.patientName}</div>
          <div className="mt-0.5 text-xs text-muted">
            {currentPlan?.name} · role: {currentPlan?.role}
          </div>
        </div>

        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          <Download className="size-3.5" /> Backup & restore
        </h3>
        <div className="mb-4 rounded-lg border border-line bg-card p-3.5">
          <p className="text-xs leading-relaxed text-muted">
            Export all local app and care-plan data to a JSON backup file, or
            restore from a previous backup. Restoring replaces local data on
            this device. Device encryption keys are not exported.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportBackup}
              disabled={backupBusy || busy}
            >
              <Download className="size-3.5" />{" "}
              {backupBusy ? "Working…" : "Export backup"}
            </Button>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <Field label="Restore from backup file">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleRestoreFileChange}
                aria-label="Restore backup file"
                className="block w-full text-xs text-ink-2 file:mr-3 file:rounded-md file:border file:border-line file:bg-app file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
              />
            </Field>
            {restoreFile ? (
              <div className="mt-2">
                {!confirmRestore ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmRestore(true)}
                    disabled={backupBusy || busy}
                  >
                    <Upload className="size-3.5" /> Restore selected backup
                  </Button>
                ) : (
                  <div className="rounded-md border border-missed bg-missed-soft p-3">
                    <p className="mb-2 text-xs leading-relaxed text-ink-2">
                      <b className="text-ink">
                        Replace all local data with this backup?
                      </b>{" "}
                      Current plans, records, and local session/profile data on
                      this device will be overwritten.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={handleRestoreBackup}
                        disabled={backupBusy}
                      >
                        {backupBusy ? "Restoring…" : "Restore backup"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmRestore(false)}
                        disabled={backupBusy}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            {backupMessage ? (
              <p className="mt-2 text-xs font-semibold text-brand">
                {backupMessage}
              </p>
            ) : null}
          </div>
        </div>

        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-missed">
          <Trash2 className="size-3.5" /> Danger zone
        </h3>
        {error ? (
          <p className="mb-2 text-xs font-semibold text-missed">{error}</p>
        ) : null}
        <Button
          variant="danger"
          onClick={handleDeletePlan}
          disabled={busy}
        >
          {busy ? "Deleting…" : "Delete this plan"}
        </Button>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          Sathi — care coordination. Runs standalone on this device; connects to
          servers when available.
        </p>
      </div>
    </div>
  );
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
