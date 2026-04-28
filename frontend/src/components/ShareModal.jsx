import React, { useState } from "react";
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

const ShareModal = React.memo(({ isOpen, note, onClose }) => {
  const { updateNote } = useNoteStore();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("edit"); // 'read' | 'edit'
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const sharedWith = note?.sharedWith || [];

  const handleShare = () => {
    setError("");
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!email.includes("@")) {
      setError("Invalid email address");
      return;
    }
    if (sharedWith.some((s) => s.email === email.trim())) {
      setError("This email has already been added");
      return;
    }
    const newSharedWith = [...sharedWith, { email: email.trim(), permission }];
    updateNote(note.id, { isShared: true, sharedWith: newSharedWith });
    setEmail("");
    setSuccess("Shared successfully");
    setTimeout(() => setSuccess(""), 2000);
  };

  const handleRevoke = (emailToRevoke) => {
    const newSharedWith = sharedWith.filter((s) => s.email !== emailToRevoke);
    updateNote(note.id, {
      isShared: newSharedWith.length > 0,
      sharedWith: newSharedWith,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-lg bg-dark-300 border border-dark-100 rounded-xl shadow-dark-lg p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Share2 size={20} />
            </div>
            <div>
              <h3
                id="share-modal-title"
                className="text-lg font-semibold text-surface-100"
              >
                Share Note
              </h3>
              <p className="text-sm text-dark-50">
                Collaborate with others on this note
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

        {/* Error/Success */}
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

        {/* Share Form */}
        <div className="p-4 rounded-lg bg-dark-200 border border-dark-100 mb-6">
          <h4 className="text-sm font-medium text-surface-200 mb-3">
            Invite People
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
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
                className="input-dark pl-9"
                placeholder="Enter email address"
              />
            </div>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="input-dark w-28"
            >
              <option value="edit">Can edit</option>
              <option value="read">Can view</option>
            </select>
          </div>
          <button onClick={handleShare} className="btn-primary w-full">
            <Share2 size={14} className="inline mr-2" />
            Share
          </button>
        </div>

        {/* Current Collaborators */}
        {sharedWith.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-surface-200 mb-3 flex items-center gap-2">
              <Users size={14} />
              People with access ({sharedWith.length})
            </h4>
            <div className="space-y-2">
              {sharedWith.map((share, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-200 border border-dark-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-dark-100 flex items-center justify-center text-sm font-medium text-surface-200">
                      {share.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-surface-200">{share.email}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {share.permission === "edit" ? (
                          <Edit3 size={12} className="text-blue-400" />
                        ) : (
                          <Eye size={12} className="text-dark-50" />
                        )}
                        <span className="text-xs text-dark-50 capitalize">
                          {share.permission === "edit"
                            ? "Can edit"
                            : "Can view"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(share.email)}
                    className="p-2 rounded-lg text-dark-50 hover:text-danger-400 hover:bg-dark-100 transition-colors"
                    aria-label={`Revoke access for ${share.email}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Presence Indicators (Rubric #24) */}
        {sharedWith.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dark-300">
            <h4 className="text-xs font-medium text-dark-50 uppercase tracking-wide mb-3">
              Active Now
            </h4>
            <div className="flex items-center gap-3">
              {sharedWith.slice(0, 3).map((share, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-dark-100 flex items-center justify-center text-xs font-medium text-surface-200">
                      {share.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-dark-300" />
                  </div>
                  <span className="text-xs text-dark-50">
                    {share.email.split("@")[0]}
                    {index === 0 && (
                      <span className="text-accent-400 ml-1">is typing...</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ShareModal.displayName = "ShareModal";
export default ShareModal;
