import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import { Table as TableExt } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Calendar,
  FolderOpen,
  Bold,
  Italic,
  Underline,
  Image as ImageIcon,
  Link as LinkIcon,
  Table,
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
} from "lucide-react";
import useNoteStore from "../store/useNoteStore";
import ConfirmationModal from "./ConfirmationModal";
import PasswordModal from "./PasswordModal";
import ShareModal from "./ShareModal";

const NoteEditor = React.memo(({ note, onClose }) => {
  const { updateNote, togglePin, deleteNote, labels, folders, moveNote } =
    useNoteStore();

  const [title, setTitle] = useState(note?.title || "");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const actionsRef = useRef(null);
  const folderRef = useRef(null);
  const saveTimerRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      TableExt.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: note?.content || "",
    onUpdate: ({ editor: ed }) => {
      setSaveStatus("unsaved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateNote(note.id, { content: ed.getHTML() }).then(() =>
          setSaveStatus("saved"),
        );
      }, 1000);
    },
  });

  // Sync editor content when switching notes
  useEffect(() => {
    setTitle(note?.title || "");
    setSaveStatus("saved");
    if (editor && !editor.isDestroyed) {
      const current = editor.getHTML();
      const incoming = note?.content || "";
      if (current !== incoming) {
        editor.commands.setContent(incoming, false);
      }
    }
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save title changes
  useEffect(() => {
    if (!note || title === note.title) return;
    const timer = setTimeout(() => {
      setSaveStatus("saving");
      updateNote(note.id, { title: title || "Untitled" }).then(() =>
        setSaveStatus("saved"),
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowLabelDropdown(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target))
        setShowActionsMenu(false);
      if (folderRef.current && !folderRef.current.contains(e.target))
        setShowFolderDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleTogglePin = useCallback(() => {
    togglePin(note.id);
  }, [togglePin, note?.id]);

  const handleToggleLabel = useCallback(
    (labelObj) => {
      const currentLabels = note.labels || [];
      const has = currentLabels.some((l) => l.id === labelObj.id);
      const newLabels = has
        ? currentLabels.filter((l) => l.id !== labelObj.id)
        : [...currentLabels, labelObj];
      updateNote(note.id, { labels: newLabels });
    },
    [note, updateNote],
  );

  const handleDelete = useCallback(async () => {
    deleteNote(note.id);
    setShowDeleteConfirm(false);
    onClose();
  }, [deleteNote, note?.id, onClose]);

  const handleMoveToFolder = useCallback(
    (folderId) => {
      moveNote(note.id, folderId);
      setShowFolderDropdown(false);
    },
    [moveNote, note?.id],
  );

  // Toolbar helpers
  const handleAddImage = useCallback(() => {
    const url = window.prompt("Image URL:");
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const handleAddLink = useCallback(() => {
    const href = window.prompt("Link URL:");
    if (href && editor)
      editor.chain().focus().setLink({ href, target: "_blank" }).run();
  }, [editor]);

  const handleInsertTable = useCallback(() => {
    if (editor)
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
  }, [editor]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const currentFolder = folders.find((f) => f.id === note?.folderId);

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
      {/* Editor Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-dark-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={`text-xs ${saveStatusColor}`}>
              {saveStatusText}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-dark-50">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Online
            </div>
          </div>

          <div className="flex items-center gap-1">
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
              aria-label={note?.hasPassword ? "Unlock" : "Lock"}
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
                    Delete Note
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-2xl font-display font-semibold bg-transparent border-none text-surface-100 placeholder-dark-50 focus:outline-none mb-3"
        />

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-dark-50 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{formatDate(note?.createdAt)}</span>
          </div>
          <div className="relative" ref={folderRef}>
            <button
              onClick={() => setShowFolderDropdown(!showFolderDropdown)}
              className="flex items-center gap-1.5 hover:text-surface-200 transition-colors"
            >
              <FolderOpen size={14} />
              <span>{currentFolder?.name || "No folder"}</span>
            </button>
            {showFolderDropdown && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg py-1 z-50 animate-scale-in max-h-48 overflow-y-auto">
                <button
                  onClick={() => handleMoveToFolder(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-dark-100 transition-colors"
                >
                  No folder
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleMoveToFolder(f.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-dark-100 transition-colors ${
                      note?.folderId === f.id
                        ? "text-accent-400"
                        : "text-surface-200"
                    }`}
                  >
                    <FolderOpen size={14} />
                    {f.name}
                    {note?.folderId === f.id && (
                      <Check size={14} className="ml-auto text-accent-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {note?.shares?.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users size={14} />
              <span>{note.shares.length} shared</span>
            </div>
          )}
        </div>

        {/* Labels Row */}
        <div className="flex flex-wrap items-center gap-2">
          {(note?.labels || []).map((label) => (
            <button
              key={label.id}
              onClick={() => handleToggleLabel(label)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-dark-200 text-surface-200 hover:bg-dark-100 transition-colors duration-150"
              style={{ borderLeft: `3px solid ${label.color || "#3b82f6"}` }}
            >
              {label.name}
              <X size={12} className="text-dark-50" />
            </button>
          ))}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowLabelDropdown(!showLabelDropdown)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors duration-150"
            >
              <Plus size={12} />
              Add Label
            </button>
            {showLabelDropdown && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg py-1 z-50 animate-scale-in max-h-48 overflow-y-auto">
                {labels.map((label) => {
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
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar */}
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
          onClick={handleAddImage}
          className={toolbarBtn(false)}
          aria-label="Insert image"
        >
          <ImageIcon size={16} />
        </button>
        <button
          onClick={handleAddLink}
          className={toolbarBtn(editor?.isActive("link"))}
          aria-label="Insert link"
        >
          <LinkIcon size={16} />
        </button>
        <button
          onClick={handleInsertTable}
          className={toolbarBtn(false)}
          aria-label="Insert table"
        >
          <Table size={16} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 tiptap-editor">
        <EditorContent editor={editor} className="prose-editor" />
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Note"
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
      />
    </div>
  );
});

NoteEditor.displayName = "NoteEditor";
export default NoteEditor;
