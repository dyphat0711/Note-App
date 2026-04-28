import React, { useState } from "react";
import { Lock } from "lucide-react";
import useNoteStore from "../store/useNoteStore";

const UnlockOverlay = ({ note }) => {
  const unlockNote = useNoteStore((s) => s.unlockNote);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      await unlockNote(note.id, password);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "Incorrect password"
          : "Failed to unlock note",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-dark-500 flex flex-col items-center justify-center text-dark-50">
      <div className="w-full max-w-xs text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Lock size={28} className="text-amber-400" />
        </div>
        <h3 className="text-lg font-display font-medium text-surface-200 mb-2">
          This note is locked
        </h3>
        <p className="text-sm mb-6">
          Enter the password to view &ldquo;{note.title || "Untitled"}&rdquo;
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
              {error}
            </div>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-dark w-full"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="btn-primary w-full"
          >
            {loading ? "Unlocking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UnlockOverlay;
