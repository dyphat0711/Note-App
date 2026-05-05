import React, { useState } from "react";
import { X, Lock, Unlock, Check, ShieldCheck, KeyRound } from "lucide-react";
import useNoteStore from "../store/useNoteStore";

const TABS = {
  SET: "set",
  CHANGE: "change",
  DISABLE: "disable",
};

const PasswordModal = React.memo(({ isOpen, note, onClose }) => {
  const setNotePassword = useNoteStore((s) => s.setNotePassword);

  const initialTab = note?.hasPassword ? TABS.CHANGE : TABS.SET;
  const [tab, setTab] = useState(initialTab);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTab(note?.hasPassword ? TABS.CHANGE : TABS.SET);
      reset();
    }
  }, [isOpen, note?.id, note?.hasPassword]);

  if (!isOpen) return null;

  function reset() {
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit() {
    setError("");
    setSuccess("");

    if (tab === TABS.SET) {
      if (password.length < 4) {
        setError("Password must be at least 4 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      try {
        await setNotePassword(note.id, {
          action: "set",
          password,
          password_confirmation: confirmPassword,
        });
        setSuccess("Note locked successfully.");
        setTimeout(handleClose, 800);
      } catch (e) {
        setError(extractError(e) || "Failed to set password.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (tab === TABS.CHANGE) {
      if (!currentPassword) {
        setError("Enter your current password.");
        return;
      }
      if (password.length < 4) {
        setError("New password must be at least 4 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
      setLoading(true);
      try {
        await setNotePassword(note.id, {
          action: "change",
          current_password: currentPassword,
          password,
          password_confirmation: confirmPassword,
        });
        setSuccess("Password changed.");
        setTimeout(handleClose, 800);
      } catch (e) {
        setError(extractError(e) || "Failed to change password.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (tab === TABS.DISABLE) {
      if (!currentPassword) {
        setError("Enter your current password to disable protection.");
        return;
      }
      setLoading(true);
      try {
        await setNotePassword(note.id, {
          action: "disable",
          current_password: currentPassword,
        });
        setSuccess("Password protection removed.");
        setTimeout(handleClose, 800);
      } catch (e) {
        setError(extractError(e) || "Failed to disable password.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      <div className="w-full max-w-md bg-dark-300 border border-dark-100 rounded-xl shadow-dark-lg p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                note?.hasPassword
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-accent-500/10 text-accent-400"
              }`}
            >
              <Lock size={20} />
            </div>
            <div>
              <h3
                id="password-modal-title"
                className="text-lg font-semibold text-surface-100"
              >
                {note?.hasPassword ? "Manage password" : "Set password"}
              </h3>
              <p className="text-xs text-dark-50">
                {note?.hasPassword
                  ? "Change or remove the protection on this note"
                  : "Protect this note with a password (entered twice)"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {note?.hasPassword && (
          <div className="flex gap-1 mb-4 p-0.5 bg-dark-200 rounded-lg">
            <TabButton
              active={tab === TABS.CHANGE}
              onClick={() => {
                setTab(TABS.CHANGE);
                reset();
              }}
              icon={<KeyRound size={14} />}
            >
              Change
            </TabButton>
            <TabButton
              active={tab === TABS.DISABLE}
              onClick={() => {
                setTab(TABS.DISABLE);
                reset();
              }}
              icon={<Unlock size={14} />}
            >
              Disable
            </TabButton>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm flex items-center gap-2">
            <Check size={16} />
            {success}
          </div>
        )}

        <div className="space-y-3">
          {(tab === TABS.CHANGE || tab === TABS.DISABLE) && (
            <Field
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
              autoFocus
            />
          )}
          {(tab === TABS.SET || tab === TABS.CHANGE) && (
            <>
              <Field
                label={tab === TABS.SET ? "Password" : "New password"}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Min. 4 characters"
                autoFocus={tab === TABS.SET}
              />
              <Field
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter password"
              />
            </>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className={
              tab === TABS.DISABLE ? "btn-danger w-full" : "btn-primary w-full"
            }
          >
            {loading ? "Processing..." : labelForTab(tab)}
          </button>

          {tab === TABS.SET && (
            <p className="text-[11px] text-dark-50 flex items-start gap-1.5">
              <ShieldCheck size={12} className="mt-0.5 flex-shrink-0" />
              The password is hashed via bcrypt before being stored.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

function labelForTab(tab) {
  if (tab === TABS.SET) return "Lock note";
  if (tab === TABS.CHANGE) return "Change password";
  if (tab === TABS.DISABLE) return "Disable protection";
  return "Submit";
}

function extractError(err) {
  const data = err?.response?.data;
  if (!data) return null;
  if (data.errors) {
    const first = Object.values(data.errors)[0];
    return Array.isArray(first) ? first[0] : first;
  }
  return data.message || null;
}

const Field = ({ label, type = "text", value, onChange, placeholder, autoFocus }) => (
  <div>
    <label className="block text-sm font-medium text-surface-200 mb-1.5">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-dark"
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  </div>
);

const TabButton = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
      active
        ? "bg-dark-100 text-surface-100"
        : "text-dark-50 hover:text-surface-200"
    }`}
  >
    {icon}
    {children}
  </button>
);

PasswordModal.displayName = "PasswordModal";
export default PasswordModal;
