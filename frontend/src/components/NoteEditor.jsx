import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
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
} from "lucide-react";
import toast from "react-hot-toast";
import useNoteStore from "../store/useNoteStore";
import useAuthStore from "../store/useAuthStore";
import ConfirmationModal from "./ConfirmationModal";
import PasswordModal from "./PasswordModal";
import ShareModal from "./ShareModal";
import { joinNoteChannel, joinNotePresence, leaveNote } from "../lib/echo";

const SAVE_DEBOUNCE_MS = 800;

const NoteEditor = React.memo(({ note, onClose }) => {
  const updateNote = useNoteStore((s) => s.updateNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const labels = useNoteStore((s) => s.labels);
  const uploadAttachments = useNoteStore((s) => s.uploadAttachments);
  const deleteAttachment = useNoteStore((s) => s.deleteAttachment);
  const applyRemoteNoteUpdate = useNoteStore((s) => s.applyRemoteNoteUpdate);
  const currentUser = useAuthStore((s) => s.user);

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

  const editor = useEditor({
    editable: canEdit,
    extensions: [
      StarterKit,
      UnderlineExt,
      ImageExt.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Start writing your note..." }),
    ],
    content: note?.content || "",
    onUpdate: ({ editor: ed }) => {
      if (remoteUpdateRef.current) return;
      setSaveStatus("unsaved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        await updateNote(note.id, { content: ed.getHTML() });
        setSaveStatus("saved");
      }, SAVE_DEBOUNCE_MS);
    },
  });

  // Sync editor when switching notes or when editor enable state changes.
  useEffect(() => {
    setTitle(note?.title || "");
    setSaveStatus("saved");
    if (editor && !editor.isDestroyed) {
      editor.setEditable(canEdit);
      const incoming = note?.content || "";
      const current = editor.getHTML();
      if (current !== incoming) {
        remoteUpdateRef.current = true;
        editor.commands.setContent(incoming, false);
        remoteUpdateRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, canEdit]);

  // Auto-save title.
  useEffect(() => {
    if (!note || !canEdit || title === note.title) return;
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      await updateNote(note.id, { title: title || "Untitled" });
      setSaveStatus("saved");
    }, SAVE_DEBOUNCE_MS);
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

    const channel = joinNoteChannel(note.id);
    const presence = joinNotePresence(note.id);
    if (!channel) return;

    channel.listen(".NoteUpdated", (payload) => {
      if (payload.updated_by === currentUser?.id) return;
      remoteUpdateRef.current = true;
      if (editor && !editor.isDestroyed && payload.content !== undefined) {
        editor.commands.setContent(payload.content || "", false);
      }
      if (payload.title !== undefined) setTitle(payload.title);
      applyRemoteNoteUpdate(note.id, {
        title: payload.title,
        content: payload.content,
        updatedAt: payload.updated_at,
      });
      remoteUpdateRef.current = false;
      toast(`${payload.updated_by_name || "A collaborator"} updated this note`, {
        icon: "✏️",
      });
    });

    if (presence) {
      presence
        .here((users) => setPresenceUsers(users))
        .joining((user) => {
          setPresenceUsers((prev) => {
            if (prev.find((u) => u.id === user.id)) return prev;
            return [...prev, user];
          });
        })
        .leaving((user) => {
          setPresenceUsers((prev) => prev.filter((u) => u.id !== user.id));
        })
        .listenForWhisper("typing", ({ userId }) => {
          setTypingUsers((prev) =>
            prev.includes(userId) ? prev : [...prev, userId],
          );
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((id) => id !== userId));
          }, 2500);
        });
    }

    return () => {
      leaveNote(note.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, note?.isShared, currentUser?.id]);

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
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "unsaved"
        ? "Unsaved"
        : "All changes saved";
  const saveStatusColor =
    saveStatus === "saving"
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
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-dark-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={`text-xs ${saveStatusColor}`}>{saveStatusText}</span>
            {note?.isShared && presenceUsers.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-dark-50">
                <span className="flex -space-x-1.5">
                  {presenceUsers.slice(0, 3).map((u) => (
                    <span
                      key={u.id}
                      className="w-5 h-5 rounded-full bg-accent-500/30 border border-dark-500 flex items-center justify-center text-[10px] text-accent-200 font-medium"
                      title={u.display_name || u.email}
                    >
                      {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span>{presenceUsers.length} online</span>
              </div>
            )}
            {!note?.isOwner && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">
                <Users size={10} />
                Shared · {note?.sharePermission || "read"}
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
              Shared by {note.owner.display_name || note.owner.email}
            </span>
          )}
        </div>

        {/* Labels */}
        <div className="flex flex-wrap items-center gap-2">
          {(note?.labels || []).map((label) => (
            <button
              key={label.id}
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
        <div className="flex-shrink-0 px-6 py-2 border-b border-dark-300 flex items-center gap-1">
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
            title="Attach image (jpg, png, webp, gif – max 5MB)"
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
              {note.attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative rounded-lg overflow-hidden border border-dark-300 bg-dark-200"
                >
                  {att.url && att.mime?.startsWith("image/") ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-dark-50">
                      <AlertCircle size={20} />
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
