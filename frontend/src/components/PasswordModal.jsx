import React, { useState } from "react";
import { X, Lock, Unlock, Check } from "lucide-react";
import useNoteStore from "../store/useNoteStore";

const PasswordModal = React.memo(({ isOpen, note, onClose }) => {
  const setNotePassword = useNoteStore((s) => s.setNotePassword);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetFields = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  const handleSetPassword = async () => {
    setError("");
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await setNotePassword(note.id, password);
      setSuccess("Password set successfully");
      setTimeout(() => {
        resetFields();
        onClose();
      }, 1000);
    } catch {
      setError("Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    setError("");
    setLoading(true);
    try {
      await setNotePassword(note.id, null);
      setSuccess("Password removed");
      setTimeout(() => {
        resetFields();
        onClose();
      }, 1000);
    } catch {
      setError("Failed to remove password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      <div className="w-full max-w-md bg-dark-300 border border-dark-100 rounded-xl shadow-dark-lg p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
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
                {note?.hasPassword ? "Password Protection" : "Set Password"}
              </h3>
              <p className="text-sm text-dark-50">
                {note?.hasPassword
                  ? "Manage or remove note password"
                  : "Protect this note with a password"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetFields();
              onClose();
            }}
            className="p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm flex items-center gap-2">
            <Check size={16} />
            {success}
          </div>
        )}

        {!note?.hasPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark"
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-dark"
                placeholder="Re-enter password"
              />
            </div>
            <button
              onClick={handleSetPassword}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Setting..." : "Set Password"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-dark-200 border border-dark-100">
              <h4 className="text-sm font-medium text-surface-200 mb-3">
                Remove Password
              </h4>
              <p className="text-xs text-dark-50 mb-3">
                This will remove password protection from the note
              </p>
              <button
                onClick={handleRemovePassword}
                disabled={loading}
                className="btn-danger w-full"
              >
                <Unlock size={14} className="inline mr-2" />
                {loading ? "Removing..." : "Remove Password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PasswordModal.displayName = "PasswordModal";
export default PasswordModal;
