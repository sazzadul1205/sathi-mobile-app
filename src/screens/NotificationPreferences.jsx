import { useEffect, useMemo, useState } from "react";
import {
  ScreenHeader,
  Toggle,
  Button,
  Card,
  StatusPill,
} from "../components/ui.jsx";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  getPushCapability,
  requestPushPermission,
  ensureFcmToken,
  getStoredFcmToken,
  bindForegroundPush,
  showLocalNotification,
} from "../lib/notifications/push.js";

const PREFS = [
  {
    id: "dose",
    label: "Upcoming doses",
    hint: "Reminders before scheduled dose times",
  },
  {
    id: "outcomes",
    label: "Dose outcomes recorded",
    hint: "When another caregiver records outcomes",
  },
  {
    id: "lowstock",
    label: "Low stock & purchase needs",
    hint: "When usable stock falls below threshold",
  },
  {
    id: "transfers",
    label: "Transfer updates",
    hint: "Preparation and receipt updates",
  },
  {
    id: "membership",
    label: "Membership changes",
    hint: "Invitations and permission changes",
  },
];

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(() => getNotificationPrefs());
  const [capability, setCapability] = useState(() => getPushCapability());
  const [token, setToken] = useState(() => getStoredFcmToken());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setNotificationPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    let unsub = () => {};
    bindForegroundPush((payload) => {
      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        "Sathi notification";
      const body = payload?.notification?.body || payload?.data?.body || "";
      showLocalNotification(title, { body, data: payload?.data || {} });
    }).then((u) => {
      unsub = typeof u === "function" ? u : () => {};
    });
    return () => {
      try {
        unsub();
      } catch {
        /* noop */
      }
    };
  }, []);

  const permissionTone = useMemo(() => {
    if (capability.permission === "granted") return "ok";
    if (capability.permission === "denied") return "missed";
    return "pending";
  }, [capability.permission]);

  async function enablePush() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await requestPushPermission();
      const nextCap = { ...getPushCapability(), permission };
      setCapability(nextCap);
      if (permission !== "granted") {
        setMessage(
          permission === "denied"
            ? "Notification permission denied by browser."
            : "Notification permission not granted.",
        );
        return;
      }
      const reg = await navigator.serviceWorker?.ready?.catch(() => null);
      const t = await ensureFcmToken(reg || undefined);
      setToken(t);
      setMessage(
        t
          ? "Push token registered on this device."
          : "Firebase/VAPID not configured or messaging unsupported; local notifications remain available when permitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  function updatePref(id, value) {
    setPrefs((s) => ({ ...s, [id]: value }));
  }

  return (
    <div>
      <ScreenHeader
        title="Notification preferences"
        subtitle="Per-category controls"
        backTo
      />

      <Card className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Push notifications</div>
            <div className="mt-1 text-[11px] leading-relaxed text-muted">
              Browser permission: <b>{capability.permission}</b>. Firebase:{" "}
              <b>{capability.configured ? "configured" : "not configured"}</b>.
              {token ? " Device token stored locally." : ""}
            </div>
          </div>
          <StatusPill tone={permissionTone}>{capability.permission}</StatusPill>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={enablePush}
            disabled={busy || !capability.supported}
          >
            {busy ? "Enabling…" : "Enable push"}
          </Button>
        </div>
        {message ? (
          <p className="mt-2 text-[11px] text-muted">{message}</p>
        ) : null}
        {!capability.supported ? (
          <p className="mt-2 text-[11px] text-muted">
            Notifications are not supported in this browser/context.
          </p>
        ) : null}
      </Card>

      <div className="rounded-lg border border-line bg-card p-1">
        {PREFS.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 border-b border-line-2 px-3 py-3 last:border-0"
          >
            <div>
              <div className="text-sm font-semibold">{p.label}</div>
              <div className="text-[11px] text-muted">{p.hint}</div>
            </div>
            <Toggle
              checked={Boolean(prefs[p.id])}
              onChange={(v) => updatePref(p.id, v)}
              label={p.label}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-line bg-card px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Security alerts</div>
            <div className="text-[11px] text-muted">
              Always on — cannot be disabled
            </div>
          </div>
          <span className="text-[11px] font-bold text-brand">Always on</span>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-line bg-card px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              Hide preview on lock screen
            </div>
            <div className="text-[11px] text-muted">
              Medicine and patient names hidden in previews
            </div>
          </div>
          <Toggle
            checked={Boolean(prefs.hidePreview)}
            onChange={(v) => updatePref("hidePreview", v)}
            label="Hide preview"
          />
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Browser/OS restrictions may delay reminders. Preferences are stored
        locally. Background push requires Firebase config, VAPID key, and a
        compatible service worker.
      </p>
    </div>
  );
}
