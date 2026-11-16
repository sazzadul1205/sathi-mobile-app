import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Field, ScreenHeader, TextInput } from "../components/ui.jsx";

export default function AccountRecovery() {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader
          title="Recover account"
          subtitle="Verified recovery only"
          backTo
        />
        <div className="rounded-lg border border-line bg-card p-4 shadow-1">
          <p className="mb-4 text-sm leading-relaxed text-ink-2">
            On this device, Sathi uses local device profiles and does not send
            recovery emails or grant care-plan ownership. If a verified server
            account is connected later, recovery will use that verified method.
          </p>
          <Field label="Email or phone">
            <TextInput
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Button
            type="button"
            onClick={() => setSent(true)}
            disabled={!value.trim()}
          >
            {sent ? "Recovery request noted" : "Send recovery link"}
          </Button>
          {sent ? (
            <p className="mt-3 text-xs text-muted">
              No server is connected in standalone mode. Sign in with an
              existing device profile or create a new one on this device.
            </p>
          ) : null}
          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs font-semibold text-brand">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
