import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Calendar,
  Bold,
  Italic,
  Underline,
  Image as ImageIcon,
  MoreHorizontal,
  Lock,
  Unlock,
  Share2,
  Trash2,
  Pin,
  Check,
  X,
  Users,
  Plus,
  AlertCircle,
  WifiOff,
  Eye,
  Edit3,
  Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import useNoteStore from "../store/useNoteStore";
import useAuthStore from "../store/useAuthStore";
import ConfirmationModal from "./ConfirmationModal";
import PasswordModal from "./PasswordModal";
import ShareModal from "./ShareModal";
import { getEcho, ensureEcho, joinNoteChannel, joinNotePresence, leaveNote } from "../lib/echo";
import { useOfflineSync } from "../hooks/useOfflineSync";

const SAVE_DEBOUNCE_MS = 800;

// Longer debounce for title — user usually pauses longer between title edits
const TITLE_DEBOUNCE_MS = 1000;

function getRenderableContent(content, attachments = []) {
  if (!content || typeof content !== "string") return "";

  const attachmentUrls = new Set(
    attachments
      .filter((att) => att?.exists !== false && att?.url)
      .map((att) => att.url),
  );

  return content.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (tag, src) => {
    if (src.startsWith("/storage/") && !attachmentUrls.has(src)) {
      return "";
    }
    return tag;
  });
}

function normalizePresenceUser(raw) {
  const user = raw?.user_info || raw?.userInfo || raw || {};
  const displayName = user.display_name || user.displayName || user.name || null;
  const email = user.email || null;
  const id = user.id ?? raw?.id ?? email ?? displayName;

  return {
    id,
    displayName,
    display_name: displayName,
    email,
  };
}

const NoteEditor = React.memo(({ note, onClose }) => {
  const updateNote = useNoteStore((s) => s.updateNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const labels = useNoteStore((s) => s.labels);
  const uploadAttachments = useNoteStore((s) => s.uploadAttachments);
  const deleteAttachment = useNoteStore((s) => s.deleteAttachment);
  const applyRemoteNoteUpdate = useNoteStore((s) => s.applyRemoteNoteUpdate);
  const currentUser = useAuthStore((s) => s.user);
  const { isOnline } = useOfflineSync();

  const canEdit = note?.isOwner || note?.sharePermission === "edit";

  const [title, setTitle] = useState(note?.title || "");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const dropdownRef = useRef(null);
  const actionsRef = useRef(null);
  const fileInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const remoteUpdateRef = useRef(false); // flag to avoid echoing local changes
  const whisperTimerRef = useRef(null); // throttle typing whispers
  // Tracks the last content that was actually sent to the server.
  // Used to skip saves when the user reverts to the previously saved value.
  const lastSavedContentRef = useRef(getRenderableContent(note?.content, note?.attachments));
  // Accumulates pending field updates so title+content are batched into one API call.
  const pendingUpdatesRef = useRef({});

  const editor = useEditor({
    editable: canEdit,
    extensions: [
      StarterKit,
      ImageExt.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Start writing your note..." }),
    ],
    content: getRenderableContent(note?.content, note?.attachments),
    onUpdate: ({ editor: ed }) => {
      if (remoteUpdateRef.current) return;

      // ── Diff check: skip save if content reverted to last-saved value ──
      const html = ed.getHTML();
      if (html === lastSavedContentRef.current) {
        // User typed then immediately undid — nothing to save
        setSaveStatus("saved");
        return;
      }

      setSaveStatus("unsaved");

      // Broadcast typing whisper to collaborators (throttled to 1 per second)
      if (note?.isShared && canEdit && !whisperTimerRef.current) {
        try {
          const echo = getEcho();
          if (echo) {
            echo.join(`note.${note.id}`).whisper("typing", {
              userId: currentUser?.id,
              userName: currentUser?.displayName || currentUser?.email,
            });
          }
        } catch { /* ignore whisper failures */ }
        whisperTimerRef.current = setTimeout(() => {
          whisperTimerRef.current = null;
        }, 1000);
      }

      // ── Batch update: accumulate content, flush with title together ──
      pendingUpdatesRef.current.content = html;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const updates = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};
        if (Object.keys(updates).length === 0) return;
        setSaveStatus("saving");
        await updateNote(note.id, updates);
        if (updates.content !== undefined) lastSavedContentRef.current = updates.content;
        setSaveStatus("saved");
      }, SAVE_DEBOUNCE_MS);
    },
  });

  // Sync editor when switching notes or when editor enable state changes.
  useEffect(() => {
    setTitle(note?.title || "");
    setSaveStatus("saved");
    // Reset saved-content tracking for the newly opened note
    const renderableContent = getRenderableContent(note?.content, note?.attachments);
    lastSavedContentRef.current = renderableContent;
    pendingUpdatesRef.current = {};
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (editor && !editor.isDestroyed) {
      editor.setEditable(canEdit);
      const incoming = renderableContent;
      const current = editor.getHTML();
      if (current !== incoming) {
        remoteUpdateRef.current = true;
        editor.commands.setContent(incoming, false);
        remoteUpdateRef.current = false;
      }
    }
  }, [note?.id, note?.title, note?.content, note?.attachments, canEdit, editor]);

  // Auto-save title — batched into the same API call as content when possible.
  useEffect(() => {
    if (!note || !canEdit || title === note.title) return;
    const timer = setTimeout(async () => {
      let finalTitle = title.trim();
      if (!finalTitle) {
        finalTitle = useNoteStore.getState().getNextUntitledTitle();
        setTitle(finalTitle);
      }
      // Merge title into pending updates so one API call covers both title+content
      pendingUpdatesRef.current.title = finalTitle;

      // If a content save is already scheduled, let it pick up the title too
      if (saveTimerRef.current) return;

      // No content save pending — flush title alone now
      const updates = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {};
      setSaveStatus("saving");
      await updateNote(note.id, updates);
      setSaveStatus("saved");
    }, TITLE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Close dropdowns on outside click.
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowLabelDropdown(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target))
        setShowActionsMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Real-time collaboration via Reverb (#24). Subscribe only when the note has shares.
  useEffect(() => {
    if (!note?.id || !note?.isShared) return;
    if (typeof note.id !== "number" && !/^\d+$/.test(String(note.id))) return;

    // Lazy-load Echo/Pusher modules before subscribing
    let cancelled = false;
    (async () => {
      await ensureEcho();
      if (cancelled) return;

      const channel = joinNoteChannel(note.id);
      const presence = joinNotePresence(note.id);
      if (!channel) return;

    channel.listen(".NoteUpdated", (payload) => {
      if (payload.updated_by === currentUser?.id) return;
      remoteUpdateRef.current = true;
      if (editor && !editor.isDestroyed && !payload.has_password && payload.content !== undefined) {
        editor.commands.setContent(payload.content || "", false);
      }
      if (payload.title !== undefined) setTitle(payload.title);
      const remotePatch = {
        title: payload.title,
        color: payload.color,
        hasPassword: payload.has_password,
        updatedAt: payload.updated_at,
      };
      if (!payload.has_password && payload.content !== undefined) {
        remotePatch.content = payload.content;
      }
      applyRemoteNoteUpdate(note.id, remotePatch);
      remoteUpdateRef.current = false;
      if (payload.has_password) {
        toast("This note has been locked by the owner.", { icon: "🔒" });
      } else {
        toast(`${payload.updated_by_name || "A collaborator"} updated this note`, {
          icon: "✏️",
        });
      }
    });


    if (presence) {
      presence
        .here((users) => setPresenceUsers((users || []).map(normalizePresenceUser)))
        .joining((user) => {
          const normalized = normalizePresenceUser(user);
          setPresenceUsers((prev) => {
            if (prev.find((u) => u.id === normalized.id || (u.email && u.email === normalized.email))) return prev;
            return [...prev, normalized];
          });
        })
        .leaving((user) => {
          const normalized = normalizePresenceUser(user);
          setPresenceUsers((prev) =>
            prev.filter((u) => u.id !== normalized.id && (!normalized.email || u.email !== normalized.email)),
          );
        })
        .listenForWhisper("typing", ({ userId, userName }) => {
          setTypingUsers((prev) => {
            if (prev.find((t) => t.id === userId)) return prev;
            return [...prev, { id: userId, name: userName }];
          });
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((t) => t.id !== userId));
          }, 2500);
        });
    }

    })(); // end async IIFE

    return () => {
      cancelled = true;
      leaveNote(note.id);
    };
  }, [note?.id, note?.isShared, currentUser?.id, editor, applyRemoteNoteUpdate]);

  const handleTogglePin = useCallback(() => {
    if (!note?.isOwner) return;
    togglePin(note.id);
  }, [togglePin, note?.id, note?.isOwner]);

  const handleToggleLabel = useCallback(
    (labelObj) => {
      if (!canEdit) return;
      const currentLabels = note.labels || [];
      const has = currentLabels.some((l) => l.id === labelObj.id);
      const newLabels = has
        ? currentLabels.filter((l) => l.id !== labelObj.id)
        : [...currentLabels, labelObj];
      updateNote(note.id, { labels: newLabels });
    },
    [canEdit, note, updateNote],
  );

  const handleDelete = useCallback(async () => {
    await deleteNote(note.id);
    setShowDeleteConfirm(false);
    onClose();
    toast.success("Note deleted");
  }, [deleteNote, note?.id, onClose]);

  const handleAttachImages = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0 || !note || !canEdit) return;

      const tooLarge = files.find((f) => f.size > 5 * 1024 * 1024);
      if (tooLarge) {
        toast.error(`"${tooLarge.name}" exceeds 5MB.`);
        return;
      }

      try {
        toast.loading("Uploading…", { id: "upload" });
        const newAttachments = await uploadAttachments(note.id, files);
        toast.success(`${newAttachments.length} image(s) added`, { id: "upload" });
        // Insert each image at the current caret position.
        if (editor && !editor.isDestroyed) {
          newAttachments.forEach((att) => {
            if (att.url) {
              editor.chain().focus().setImage({ src: att.url, alt: att.name }).run();
            }
          });
        }
      } catch (err) {
        const msg = err.response?.data?.message || "Upload failed";
        toast.error(msg, { id: "upload" });
      } finally {
        e.target.value = "";
      }
    },
    [canEdit, editor, note, uploadAttachments],
  );

  const handleDeleteAttachment = useCallback(
    async (attachment) => {
      try {
        await deleteAttachment(note.id, attachment.id);
        toast.success("Attachment removed");
      } catch {
        toast.error("Failed to remove attachment");
      }
    },
    [deleteAttachment, note?.id],
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const saveStatusText =
    !isOnline
      ? "Queued offline"
      : saveStatus === "saving"
        ? "Saving..."
        : saveStatus === "unsaved"
          ? "Unsaved"
          : "All changes saved";
  const saveStatusColor =
    !isOnline
      ? "text-amber-400"
      : saveStatus === "saving"
        ? "text-dark-50"
        : saveStatus === "unsaved"
          ? "text-amber-400"
          : "text-dark-50";

  const toolbarBtn = (active) =>
    `p-1.5 rounded transition-colors ${
      active
        ? "bg-accent-500/20 text-accent-400"
        : "text-dark-50 hover:text-surface-200 hover:bg-dark-200"
    }`;

  return (
    <div className="flex-1 bg-dark-500 flex flex-col h-full overflow-hidden">
      {/* Collaboration banner – shows when other users are present */}
      {note?.isShared && presenceUsers.length > 1 && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-2 flex items-center justify-between" style={{
          background: "rgba(59, 130, 246, 0.06)",
          borderBottom: "1px solid rgba(59, 130, 246, 0.12)",
        }}>
          <div className="flex items-center gap-2">
            <span className="live-indicator" />
            <span className="text-xs text-blue-300 font-medium">
              {presenceUsers.length} collaborator{presenceUsers.length !== 1 ? "s" : ""} online
            </span>
            {typingUsers.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-accent-300">
                <span className="typing-indicator">
                  <span /><span /><span />
                </span>
                {typingUsers.map((t) => t.name || "Someone").join(", ")}
                {typingUsers.length === 1 ? " is" : " are"} typing…
              </span>
            )}
          </div>
          <div className="presence-avatar-stack">
            {presenceUsers.slice(0, 5).map((u, index) => (
              <span
                key={u.id ?? u.email ?? u.displayName ?? u.display_name ?? `presence-${index}`}
                className="presence-avatar"
                style={{
                  background: u.id === currentUser?.id
                    ? "rgba(99, 102, 241, 0.25)"
                    : "rgba(59, 130, 246, 0.2)",
                  color: u.id === currentUser?.id
                    ? "rgb(165, 180, 252)"
                    : "rgb(147, 197, 253)",
                }}
                title={`${u.displayName || u.display_name || u.email || "Unknown"}${u.id === currentUser?.id ? " (you)" : ""}`}
              >
                {(u.displayName || u.display_name || u.email || "?").charAt(0).toUpperCase()}
              </span>
            ))}
            {presenceUsers.length > 5 && (
              <span className="presence-avatar" style={{
                background: "rgba(var(--dark-200), 0.8)",
                color: "rgb(var(--dark-50))",
              }}>
                +{presenceUsers.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-dark-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 text-xs ${saveStatusColor}`}>
              {!isOnline && <WifiOff size={11} />}
              {saveStatusText}
            </span>
            {note?.isShared && presenceUsers.length > 0 && presenceUsers.length <= 1 && (
              <div className="flex items-center gap-1 text-xs text-dark-50">
                <span className="live-indicator" style={{ marginRight: "2px" }} />
                <span>Connected</span>
              </div>
            )}
            {!note?.isOwner && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                note?.sharePermission === "edit"
                  ? "bg-blue-500/10 text-blue-300"
                  : "bg-slate-500/10 text-slate-400"
              }`}>
                {note?.sharePermission === "edit" ? <Edit3 size={10} /> : <Eye size={10} />}
                {note?.sharePermission === "edit" ? "Can Edit" : "Read Only"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {note?.isOwner && (
              <>
                <button
                  onClick={handleTogglePin}
                  className={`p-2 rounded-lg transition-colors duration-150 ${
                    note?.isPinned
                      ? "text-accent-400 bg-accent-500/10"
                      : "text-dark-50 hover:text-surface-200 hover:bg-dark-200"
                  }`}
                  aria-label={note?.isPinned ? "Unpin" : "Pin"}
                >
                  <Pin size={16} />
                </button>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className={`p-2 rounded-lg transition-colors duration-150 ${
                    note?.hasPassword
                      ? "text-amber-400 bg-amber-500/10"
                      : "text-dark-50 hover:text-surface-200 hover:bg-dark-200"
                  }`}
                  aria-label={note?.hasPassword ? "Manage password" : "Lock note"}
                >
                  {note?.hasPassword ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors duration-150"
                  aria-label="Share"
                >
                  <Share2 size={16} />
                </button>
                <div className="relative" ref={actionsRef}>
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors duration-150"
                    aria-label="More actions"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {showActionsMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg py-1 z-50 animate-scale-in">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowActionsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-400 hover:bg-dark-100 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete note
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          disabled={!canEdit}
          className="w-full text-2xl font-display font-semibold bg-transparent border-none text-surface-100 placeholder-dark-50 focus:outline-none mb-3 disabled:opacity-70"
          aria-label="Note title"
        />

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-dark-50 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{formatDate(note?.createdAt)}</span>
          </div>
          {note?.shares?.length > 0 && note?.isOwner && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 hover:text-surface-200 transition-colors"
            >
              <Users size={14} />
              <span>{note.shares.length} shared</span>
            </button>
          )}
          {!note?.isOwner && note?.owner && (
            <span className="text-blue-300">
              Shared by {note.owner.displayName || note.owner.display_name || note.owner.email}
            </span>
          )}
        </div>

        {/* Labels */}
        <div className="flex flex-wrap items-center gap-2">
          {(note?.labels || []).map((label, index) => (
            <button
              key={label.id ?? `${label.name || "label"}-${label.color || "color"}-${index}`}
              onClick={() => handleToggleLabel(label)}
              disabled={!canEdit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-dark-200 text-surface-200 hover:bg-dark-100 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ borderLeft: `3px solid ${label.color || "#3b82f6"}` }}
            >
              {label.name}
              {canEdit && <X size={12} className="text-dark-50" />}
            </button>
          ))}
          {canEdit && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors duration-150"
              >
                <Plus size={12} />
                Add label
              </button>
              {showLabelDropdown && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg py-1 z-50 animate-scale-in max-h-48 overflow-y-auto">
                  {labels.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-dark-50">
                      Create labels in the sidebar first.
                    </p>
                  ) : (
                    labels.map((label) => {
                      const isSelected = (note?.labels || []).some(
                        (l) => l.id === label.id,
                      );
                      return (
                        <button
                          key={label.id}
                          onClick={() => handleToggleLabel(label)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-dark-100 transition-colors"
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 text-left text-surface-200">
                            {label.name}
                          </span>
                          {isSelected && (
                            <Check size={14} className="text-accent-400" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Toolbar */}
      {canEdit && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-2 border-b border-dark-300 flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={toolbarBtn(editor?.isActive("bold"))}
            aria-label="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={toolbarBtn(editor?.isActive("italic"))}
            aria-label="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={toolbarBtn(editor?.isActive("underline"))}
            aria-label="Underline"
          >
            <Underline size={16} />
          </button>
          <div className="w-px h-5 bg-dark-300 mx-2" />
          <button
            onClick={handleAttachImages}
            className={toolbarBtn(false)}
            aria-label="Attach images"
            title={isOnline ? "Attach image (jpg, png, webp, gif – max 5MB)" : "Attachments unavailable offline"}
            disabled={!isOnline}
          >
            <ImageIcon size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 tiptap-editor">
        <EditorContent editor={editor} className="prose-editor" />

        {/* Attachments list */}
        {note?.attachments?.length > 0 && (
          <div className="mt-8 pt-4 border-t border-dark-300">
            <h4 className="text-xs font-medium text-dark-50 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ImageIcon size={11} /> Attachments ({note.attachments.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {note.attachments.map((att, index) => (
                <div
                  key={att.id ?? att.url ?? att.name ?? `attachment-${index}`}
                  className="group relative rounded-lg overflow-hidden border border-dark-300 bg-dark-200"
                >
                  {att.exists !== false && att.url && att.mime?.startsWith("image/") ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 gap-1 text-dark-50">
                      <AlertCircle size={20} />
                      <span className="text-[11px]">File unavailable</span>
                    </div>
                  )}
                  <div className="px-2 py-1 text-[11px] text-dark-50 truncate">
                    {att.name}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteAttachment(att)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove attachment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete note"
        message={`Are you sure you want to delete "${note?.title || "Untitled"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <PasswordModal
        isOpen={showPasswordModal}
        note={note}
        onClose={() => setShowPasswordModal(false)}
      />

      <ShareModal
        isOpen={showShareModal}
        note={note}
        onClose={() => setShowShareModal(false)}
        presenceUsers={presenceUsers}
        typingUsers={typingUsers}
      />
    </div>
  );
});

NoteEditor.displayName = "NoteEditor";
export default NoteEditor;
