import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Share2,
  Users,
  Mail,
  Edit3,
  Eye,
  Trash2,
  Check,
} from "lucide-react";
import useNoteStore from "../store/useNoteStore";

const ShareModal = React.memo(({ isOpen, note, onClose, presenceUsers = [], typingUsers = [] }) => {
  const shareNote = useNoteStore((s) => s.shareNote);
  const updatePermission = useNoteStore((s) => s.updateSharePermission);
  const revokeShare = useNoteStore((s) => s.revokeShare);

  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("edit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPermission("edit");
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  const presenceMap = useMemo(() => {
    const map = new Map();
    if (isOpen && presenceUsers) {
      presenceUsers.forEach((u) => map.set(u.email?.toLowerCase?.() || u.id, u));
    }
    return map;
  }, [presenceUsers, isOpen]);

  if (!isOpen) return null;

  const shares = note?.shares || [];

  async function handleShare(e) {
    e?.preventDefault?.();
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!email.includes("@")) {
      setError("Invalid email address.");
      return;
    }
    if (shares.some((s) => s.email.toLowerCase() === email.trim().toLowerCase())) {
      setError("This email already has access. Use the permission selector to update.");
      return;
    }
    setSubmitting(true);
    try {
      await shareNote(note.id, email.trim(), permission);
      setSuccess(`Note shared with ${email.trim()}`);
      setEmail("");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        data?.errors?.email?.[0] ||
        data?.message ||
        "Failed to share note.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangePermission(share, newPermission) {
    if (share.permission === newPermission) return;
    try {
      await updatePermission(note.id, share.id, newPermission);
    } catch {
      setError("Failed to update permission.");
    }
  }

  async function handleRevoke(share) {
    try {
      await revokeShare(note.id, share.id);
    } catch {
      setError("Failed to revoke access.");
    }
  }


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-lg bg-dark-300 border border-dark-100 rounded-xl shadow-dark-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Share2 size={20} />
            </div>
            <div>
              <h3
                id="share-modal-title"
                className="text-lg font-semibold text-surface-100"
              >
                Share note
              </h3>
              <p className="text-xs text-dark-50">
                Invite registered users to read or edit this note
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

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

        <form
          onSubmit={handleShare}
          className="p-4 rounded-lg bg-dark-200 border border-dark-100 mb-5"
        >
          <h4 className="text-sm font-medium text-surface-200 mb-3">
            Invite people
          </h4>
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-50 pointer-events-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark pl-9"
                placeholder="Recipient email"
                required
              />
            </div>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="input-dark w-32"
            >
              <option value="edit">Can edit</option>
              <option value="read">Can view</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            <Share2 size={14} className="inline mr-2" />
            {submitting ? "Sharing..." : "Share"}
          </button>
        </form>

        {shares.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium text-surface-200 mb-3 flex items-center gap-2">
              <Users size={14} />
              People with access ({shares.length})
            </h4>
            <ul className="space-y-2">
              {shares.map((share) => {
                const presence = presenceMap.get(share.email?.toLowerCase?.());
                return (
                  <li
                    key={share.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-200 border border-dark-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        {share.avatarPath ? (
                          <img
                            src={`/storage/${share.avatarPath}`}
                            alt={share.displayName || share.email}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-dark-100 flex items-center justify-center text-sm font-medium text-surface-200">
                            {(share.displayName || share.email)?.charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                        {presence && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-dark-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        {share.displayName && (
                          <p className="text-sm text-surface-200 truncate font-medium">
                            {share.displayName}
                          </p>
                        )}
                        <p className={`text-sm truncate ${share.displayName ? "text-dark-50 text-xs" : "text-surface-200"}`}>
                          {share.email}
                        </p>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          {share.permission === "edit" ? (
                            <Edit3 size={11} className="text-blue-400" />
                          ) : (
                            <Eye size={11} className="text-dark-50" />
                          )}
                          <span className="text-xs text-dark-50 capitalize">
                            {share.permission === "edit" ? "Can edit" : "Can view"}
                          </span>
                          {typingUsers.includes(share.id) && (
                            <span className="text-xs text-accent-400">· typing…</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={share.permission}
                        onChange={(e) => handleChangePermission(share, e.target.value)}
                        className="bg-dark-100 border border-dark-100 text-xs text-surface-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        aria-label={`Change permission for ${share.email}`}
                      >
                        <option value="edit">edit</option>
                        <option value="read">read</option>
                      </select>
                      <button
                        onClick={() => handleRevoke(share)}
                        className="p-2 rounded-lg text-dark-50 hover:text-danger-400 hover:bg-dark-100 transition-colors"
                        aria-label={`Revoke access for ${share.email}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-dark-50">
            This note hasn't been shared yet.
          </p>
        )}
      </div>
    </div>
  );
});

ShareModal.displayName = "ShareModal";
export default ShareModal;
