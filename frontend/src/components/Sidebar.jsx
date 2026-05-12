import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  Star,
  Users,
  X,
  Edit3,
  Check,
  Trash2,
  Tag,
  Settings,
  User as UserIcon,
  PenLine,
} from "lucide-react";
import useNoteStore from "../store/useNoteStore";
import useAuthStore from "../store/useAuthStore";

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78716c",
  "#64748b",
];

const ColorPicker = ({ value, onChange, isDark = true }) => {
  const [custom, setCustom] = useState(value || "#3b82f6");

  // Keep the text input in sync when the parent changes the selected color
  useEffect(() => {
    setCustom(value || "#3b82f6");
  }, [value]);

  // Theme-aware input styles
  const inputStyle = isDark
    ? { background: "#0f172a", border: "1px solid rgba(99,102,241,0.35)", color: "#cbd5e1" }
    : { background: "#f1f5f9", border: "1px solid rgba(99,102,241,0.25)", color: "#1e293b" };

  const previewBorder = isDark
    ? "1px solid rgba(255,255,255,0.15)"
    : "1px solid rgba(0,0,0,0.12)";

  return (
    <div className="p-2.5 space-y-2.5">
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setCustom(c); onChange(c); }}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 hover:scale-110 ${
              value === c ? "border-white scale-110 shadow-md" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={custom}
          maxLength={7}
          onChange={(e) => {
            setCustom(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
          }}
          className="flex-1 px-2 py-1 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500 font-mono"
          style={inputStyle}
          placeholder="#000000"
        />
        <span
          className="w-5 h-5 rounded-md flex-shrink-0 transition-colors"
          style={{ backgroundColor: value, border: previewBorder }}
        />
      </div>
    </div>
  );
};

/**
 * Renders the ColorPicker in a portal attached to document.body so it is
 * never clipped by overflow:auto/hidden ancestor containers.
 * Automatically adapts colors to dark / light theme.
 */
const PickerPortal = ({ anchorRef, value, onChange, onClose }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const portalRef = useRef(null);

  // Detect current theme
  const isDark = document.documentElement.classList.contains("dark");

  // Theme-aware styles
  const pickerStyle = isDark
    ? {
        background: "#1e293b",          // dark-200 equivalent
        border: "1px solid rgba(99,102,241,0.3)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4)",
      }
    : {
        background: "#ffffff",           // clean white
        border: "1px solid rgba(99,102,241,0.2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
      };

  // Position the portal below the anchor button
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
      });
    }
  }, [anchorRef]);

  // Close when clicking outside the portal
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (portalRef.current && !portalRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose, anchorRef]);

  return createPortal(
    <div
      ref={portalRef}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        zIndex: 99999,
        width: "208px",
        borderRadius: "12px",
        ...pickerStyle,
      }}
    >
      <ColorPicker value={value} onChange={onChange} isDark={isDark} />
    </div>,
    document.body
  );
};

const Sidebar = React.memo(({ onClose }) => {
  // Individual selectors prevent re-renders when unrelated state changes
  // (e.g. editor content, search query, activeNoteId, etc.)
  const labels = useNoteStore((s) => s.labels);
  const activeSection = useNoteStore((s) => s.activeSection);
  const selectedLabelIds = useNoteStore((s) => s.selectedLabelIds);
  const sharedNotes = useNoteStore((s) => s.sharedNotes);
  const setActiveSection = useNoteStore((s) => s.setActiveSection);
  const toggleLabelFilter = useNoteStore((s) => s.toggleLabelFilter);
  const clearLabelFilters = useNoteStore((s) => s.clearLabelFilters);
  const createNote = useNoteStore((s) => s.createNote);
  const addLabel = useNoteStore((s) => s.addLabel);
  const updateLabel = useNoteStore((s) => s.updateLabel);
  const deleteLabel = useNoteStore((s) => s.deleteLabel);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const refreshSharedWithMe = useNoteStore((s) => s.refreshSharedWithMe);
  const user = useAuthStore((s) => s.user);

  const [showNewLabelInput, setShowNewLabelInput] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("#3b82f6");
  const [showColorPickerFor, setShowColorPickerFor] = useState(null);
  const [confirmDeleteLabelId, setConfirmDeleteLabelId] = useState(null);

  const colorPickerRef = useRef(null);
  // Ref for the new-label color swatch button (portal anchor)
  const newColorBtnRef = useRef(null);
  // Refs map for edit-label color swatch buttons
  const editColorBtnRefs = useRef({});

  const closeColorPicker = useCallback(() => setShowColorPickerFor(null), []);

  const sharedCount = sharedNotes.length;

  const navItems = [
    { id: "recents",   label: "All Notes",     icon: FileText, badge: null },
    { id: "favorites", label: "Pinned",         icon: Star,     badge: null },
    { id: "shared",    label: "Shared with me", icon: Users,    badge: sharedCount },
  ];

  const handleNewNote = async () => {
    const note = await createNote();
    if (note?.id) setActiveNote(note.id);
  };

  const handleNewLabel = async () => {
    if (newLabelName.trim()) {
      await addLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName("");
      setNewLabelColor("#3b82f6");
      setShowNewLabelInput(false);
      setShowColorPickerFor(null);
    }
  };

  const startEditLabel = (label) => {
    setEditingLabelId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color || "#3b82f6");
  };

  const saveEditLabel = async () => {
    if (editLabelName.trim() && editingLabelId) {
      await updateLabel(editingLabelId, editLabelName.trim(), editLabelColor);
      setEditingLabelId(null);
      setShowColorPickerFor(null);
    }
  };

  const handleDeleteLabel = async (id) => {
    await deleteLabel(id);
    setConfirmDeleteLabelId(null);
  };

  const isLabelSelected = (id) => selectedLabelIds.includes(id);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ width: "var(--sidebar-width, 260px)" }}
    >
      {/* Sidebar glass background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "rgb(var(--dark-600))",
            borderRight: "1px solid rgba(var(--dark-300), 0.8)",
          }}
        />
        {/* Subtle gradient accent top */}
        <div
          className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Content (above overlay) */}
      <div className="relative flex flex-col h-full">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid rgba(var(--dark-300), 0.7)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
              <PenLine size={14} className="text-accent-400" />
            </div>
            <h1 className="text-[17px] font-display font-semibold text-surface-100 italic tracking-tight">
              NoteFlow
            </h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-all duration-150"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── New Note button ── */}
        <div className="px-3 py-3">
          <button
            onClick={handleNewNote}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 group relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgb(99 102 241), rgb(79 70 229))",
              boxShadow: "0 2px 12px rgba(99, 102, 241, 0.35)",
              color: "white",
            }}
          >
            {/* Shimmer effect */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)",
              }}
            />
            <Plus size={16} className="flex-shrink-0" />
            <span>New Note</span>
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-5">

          {/* Navigation */}
          <nav className="space-y-0.5" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id && selectedLabelIds.length === 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    if (item.id === "shared") refreshSharedWithMe();
                  }}
                  className={`nav-item ${isActive ? "nav-item-active" : "nav-item-inactive"}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    size={16}
                    className={`flex-shrink-0 transition-colors duration-200 ${isActive ? "text-accent-400" : ""}`}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== null && item.badge > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-200"
                      style={{
                        background: "rgba(99, 102, 241, 0.2)",
                        color: "rgb(129, 140, 248)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(var(--dark-300), 0.5)" }} />

          {/* Labels */}
          <div>
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[11px] font-semibold text-dark-50 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={10} /> Labels
              </span>
              <div className="flex items-center gap-2">
                {selectedLabelIds.length > 0 && (
                  <button
                    onClick={clearLabelFilters}
                    className="text-[10px] text-accent-400 hover:text-accent-300 font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => { setShowNewLabelInput(true); setNewLabelColor("#3b82f6"); }}
                  className="p-1 rounded-md text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-all duration-150"
                  aria-label="Add label"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className="space-y-0.5">
              {showNewLabelInput && (
                <div className="px-2 py-2 space-y-2 animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <button
                      ref={newColorBtnRef}
                      onClick={() => setShowColorPickerFor(showColorPickerFor === "new" ? null : "new")}
                      className="w-5 h-5 rounded-full border-2 border-dark-100 flex-shrink-0 transition-transform hover:scale-110"
                      style={{ backgroundColor: newLabelColor }}
                    />
                    {showColorPickerFor === "new" && (
                      <PickerPortal
                        anchorRef={newColorBtnRef}
                        value={newLabelColor}
                        onChange={setNewLabelColor}
                        onClose={closeColorPicker}
                      />
                    )}
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNewLabel();
                        if (e.key === "Escape") { setShowNewLabelInput(false); setShowColorPickerFor(null); }
                      }}
                      placeholder="Label name..."
                      className="flex-1 px-2 py-1 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500"
                      style={{
                        background: "rgb(var(--dark-200))",
                        border: "1px solid rgb(var(--dark-100))",
                        color: "rgb(var(--surface-200))",
                      }}
                      autoFocus
                    />
                    <button onClick={handleNewLabel} className="text-accent-400 hover:text-accent-300 transition-colors" aria-label="Save">
                      <Check size={14} />
                    </button>
                    <button onClick={() => { setShowNewLabelInput(false); setShowColorPickerFor(null); }}
                      className="text-dark-50 hover:text-surface-200 transition-colors" aria-label="Cancel">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {labels.map((label) => (
                <div key={label.id} className="group relative">
                  {editingLabelId === label.id ? (
                    <div className="px-2 py-2 space-y-2 animate-fade-in-up">
                      <div className="flex items-center gap-2">
                        <button
                          ref={(el) => { editColorBtnRefs.current[label.id] = el; }}
                          onClick={() => setShowColorPickerFor(showColorPickerFor === label.id ? null : label.id)}
                          className="w-5 h-5 rounded-full border-2 border-dark-100 flex-shrink-0 transition-transform hover:scale-110"
                          style={{ backgroundColor: editLabelColor }}
                        />
                        {showColorPickerFor === label.id && (
                          <PickerPortal
                            anchorRef={{ current: editColorBtnRefs.current[label.id] }}
                            value={editLabelColor}
                            onChange={setEditLabelColor}
                            onClose={closeColorPicker}
                          />
                        )}
                        <input
                          type="text"
                          value={editLabelName}
                          onChange={(e) => setEditLabelName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditLabel();
                            if (e.key === "Escape") { setEditingLabelId(null); setShowColorPickerFor(null); }
                          }}
                          className="flex-1 px-2 py-1 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500"
                          style={{
                            background: "rgb(var(--dark-200))",
                            border: "1px solid rgb(var(--dark-100))",
                            color: "rgb(var(--surface-200))",
                          }}
                          autoFocus
                        />
                        <button onClick={saveEditLabel} className="text-accent-400 hover:text-accent-300 transition-colors" aria-label="Save">
                          <Check size={14} />
                        </button>
                        <button onClick={() => { setEditingLabelId(null); setShowColorPickerFor(null); }}
                          className="text-dark-50 hover:text-surface-200 transition-colors" aria-label="Cancel">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : confirmDeleteLabelId === label.id ? (
                    <div className="px-3 py-2 flex items-center gap-2 rounded-xl animate-fade-in-up"
                      style={{ background: "rgba(var(--dark-200), 0.8)" }}>
                      <span className="text-xs text-surface-200 flex-1 truncate">
                        Delete "{label.name}"?
                      </span>
                      <button onClick={() => handleDeleteLabel(label.id)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
                        Yes
                      </button>
                      <button onClick={() => setConfirmDeleteLabelId(null)}
                        className="text-xs text-dark-50 hover:text-surface-200 transition-colors">
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleLabelFilter(label.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
                        isLabelSelected(label.id)
                          ? "text-accent-400"
                          : "text-dark-50 hover:text-surface-200"
                      }`}
                      style={isLabelSelected(label.id) ? { background: "rgba(99,102,241,0.12)" } : {}}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-left truncate text-[13px]">{label.name}</span>
                      <span className="hidden group-hover:flex items-center gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditLabel(label); }}
                          className="p-1 rounded-md text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors"
                          aria-label={`Edit ${label.name}`}
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteLabelId(label.id); }}
                          className="p-1 rounded-md text-dark-50 hover:text-red-400 hover:bg-dark-200 transition-colors"
                          aria-label={`Delete ${label.name}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </span>
                    </button>
                  )}
                </div>
              ))}

              {labels.length === 0 && !showNewLabelInput && (
                <p className="px-3 py-3 text-xs text-dark-50/60 text-center">
                  No labels yet. Click + to create one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-3 py-3 flex items-center gap-2"
          style={{ borderTop: "1px solid rgba(var(--dark-300), 0.7)" }}
        >
          <Link
            to="/profile"
            className="flex items-center gap-2.5 flex-1 px-2.5 py-2 rounded-xl text-sm text-dark-50 hover:text-surface-200 hover:bg-dark-200/80 transition-all duration-150 min-w-0"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-7 h-7 rounded-full object-cover ring-1 ring-dark-100 flex-shrink-0"
              />
            ) : (
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-accent-400 text-xs font-semibold flex-shrink-0"
                style={{ background: "rgba(99,102,241,0.18)" }}>
                {user?.displayName?.charAt(0).toUpperCase() || <UserIcon size={14} />}
              </span>
            )}
            <span className="truncate text-[13px]">{user?.displayName || "Account"}</span>
          </Link>
          <Link
            to="/preferences"
            className="p-2 rounded-xl text-dark-50 hover:text-surface-200 hover:bg-dark-200/80 transition-all duration-150"
            aria-label="Preferences"
          >
            <Settings size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
});

Sidebar.displayName = "Sidebar";
export default Sidebar;
