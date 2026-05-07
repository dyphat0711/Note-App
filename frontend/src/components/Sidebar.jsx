import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import useNoteStore from "../store/useNoteStore";
import useAuthStore from "../store/useAuthStore";

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78716c",
  "#64748b",
];

const ColorPicker = ({ value, onChange }) => {
  const [custom, setCustom] = useState(value || "#3b82f6");

  return (
    <div className="p-2 space-y-2">
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCustom(c);
              onChange(c);
            }}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-white scale-110" : "border-transparent"
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
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          className="flex-1 px-2 py-1 text-xs bg-dark-200 border border-dark-100 rounded text-surface-200 focus:outline-none focus:ring-1 focus:ring-accent-500 font-mono"
          placeholder="#000000"
        />
        <span
          className="w-5 h-5 rounded border border-dark-100 flex-shrink-0"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
};

const Sidebar = React.memo(({ onClose }) => {
  const {
    labels,
    activeSection,
    selectedLabelIds,
    sharedNotes,
    setActiveSection,
    toggleLabelFilter,
    clearLabelFilters,
    createNote,
    addLabel,
    updateLabel,
    deleteLabel,
    setActiveNote,
    refreshSharedWithMe,
  } = useNoteStore();
  const user = useAuthStore((s) => s.user);

  // Label state
  const [showNewLabelInput, setShowNewLabelInput] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("#3b82f6");
  const [showColorPickerFor, setShowColorPickerFor] = useState(null);
  const [confirmDeleteLabelId, setConfirmDeleteLabelId] = useState(null);

  const colorPickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPickerFor(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const sharedCount = sharedNotes.length;

  const navItems = [
    { id: "recents", label: "All Notes", icon: FileText, badge: null },
    { id: "favorites", label: "Pinned", icon: Star, badge: null },
    { id: "shared", label: "Shared with me", icon: Users, badge: sharedCount },
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

  const navItemClass = (id, isActive) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${isActive
      ? "bg-accent-500/20 text-accent-400"
      : "text-dark-50 hover:bg-dark-200 hover:text-surface-200"
    }`;

  const isLabelSelected = (id) => selectedLabelIds.includes(id);

  return (
    <div className="w-64 flex-shrink-0 bg-dark-600 border-r border-dark-300 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-dark-300">
        <h1 className="text-xl font-display font-semibold text-surface-100 italic">
          NoteFlow
        </h1>
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-dark-50 hover:text-surface-200 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* New Note */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewNote}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-medium transition-colors duration-150"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6">
        {/* Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeSection === item.id && selectedLabelIds.length === 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  if (item.id === "shared") refreshSharedWithMe();
                }}
                className={`w-full ${navItemClass(item.id, isActive)}`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-500/20 text-accent-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Labels (#18, #19, #20) */}
        <div>
          <div className="flex items-center justify-between px-3 py-1.5 mb-1">
            <span className="text-xs font-medium text-dark-50 uppercase tracking-wide flex items-center gap-1.5">
              <Tag size={11} /> Labels
            </span>
            <div className="flex items-center gap-2">
              {selectedLabelIds.length > 0 && (
                <button
                  onClick={clearLabelFilters}
                  className="text-[10px] text-dark-50 hover:text-surface-200 underline"
                >
                  clear
                </button>
              )}
              <button
                onClick={() => {
                  setShowNewLabelInput(true);
                  setNewLabelColor("#3b82f6");
                }}
                className="text-dark-50 hover:text-surface-200 transition-colors"
                aria-label="Add label"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="space-y-0.5">
            {showNewLabelInput && (
              <div className="px-3 py-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="relative"
                    ref={showColorPickerFor === "new" ? colorPickerRef : undefined}
                  >
                    <button
                      onClick={() =>
                        setShowColorPickerFor(
                          showColorPickerFor === "new" ? null : "new",
                        )
                      }
                      className="w-5 h-5 rounded-full border border-dark-100 flex-shrink-0"
                      style={{ backgroundColor: newLabelColor }}
                    />
                    {showColorPickerFor === "new" && (
                      <div className="absolute left-0 top-full mt-1 z-50 w-52 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg">
                        <ColorPicker
                          value={newLabelColor}
                          onChange={setNewLabelColor}
                        />
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNewLabel();
                      if (e.key === "Escape") {
                        setShowNewLabelInput(false);
                        setShowColorPickerFor(null);
                      }
                    }}
                    placeholder="Label name..."
                    className="flex-1 px-2 py-1 text-xs bg-dark-200 border border-dark-100 rounded text-surface-200 placeholder-dark-50 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    autoFocus
                  />
                  <button
                    onClick={handleNewLabel}
                    className="text-accent-400 hover:text-accent-500"
                    aria-label="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewLabelInput(false);
                      setShowColorPickerFor(null);
                    }}
                    className="text-dark-50 hover:text-surface-200"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {labels.map((label) => (
              <div key={label.id} className="group relative">
                {editingLabelId === label.id ? (
                  <div className="px-3 py-1.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="relative"
                        ref={showColorPickerFor === label.id ? colorPickerRef : undefined}
                      >
                        <button
                          onClick={() =>
                            setShowColorPickerFor(
                              showColorPickerFor === label.id ? null : label.id,
                            )
                          }
                          className="w-5 h-5 rounded-full border border-dark-100 flex-shrink-0"
                          style={{ backgroundColor: editLabelColor }}
                        />
                        {showColorPickerFor === label.id && (
                          <div className="absolute left-0 top-full mt-1 z-50 w-52 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg">
                            <ColorPicker
                              value={editLabelColor}
                              onChange={setEditLabelColor}
                            />
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditLabel();
                          if (e.key === "Escape") {
                            setEditingLabelId(null);
                            setShowColorPickerFor(null);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-dark-200 border border-dark-100 rounded text-surface-200 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        autoFocus
                      />
                      <button
                        onClick={saveEditLabel}
                        className="text-accent-400 hover:text-accent-500"
                        aria-label="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingLabelId(null);
                          setShowColorPickerFor(null);
                        }}
                        className="text-dark-50 hover:text-surface-200"
                        aria-label="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : confirmDeleteLabelId === label.id ? (
                  <div className="px-3 py-1.5 flex items-center gap-2 bg-dark-200 rounded-lg">
                    <span className="text-xs text-surface-200 flex-1 truncate">
                      Delete "{label.name}"?
                    </span>
                    <button
                      onClick={() => handleDeleteLabel(label.id)}
                      className="text-xs text-danger-400 hover:text-danger-300"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteLabelId(null)}
                      className="text-xs text-dark-50 hover:text-surface-200"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleLabelFilter(label.id)}
                    className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${isLabelSelected(label.id)
                        ? "bg-accent-500/20 text-accent-400"
                        : "text-dark-50 hover:bg-dark-200 hover:text-surface-200"
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-left truncate">
                      {label.name}
                    </span>
                    <span className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditLabel(label);
                        }}
                        className="p-0.5 text-dark-50 hover:text-surface-200 transition-colors"
                        aria-label={`Edit ${label.name}`}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteLabelId(label.id);
                        }}
                        className="p-0.5 text-dark-50 hover:text-danger-400 transition-colors"
                        aria-label={`Delete ${label.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  </button>
                )}
              </div>
            ))}

            {labels.length === 0 && !showNewLabelInput && (
              <p className="px-3 py-2 text-xs text-dark-50/70">
                No labels yet. Click + to create one.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer: account links */}
      <div className="border-t border-dark-300 p-3 flex items-center gap-2">
        <Link
          to="/profile"
          className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg text-sm text-dark-50 hover:bg-dark-200 hover:text-surface-200 transition-colors"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <span className="w-7 h-7 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 text-xs font-medium">
              {user?.displayName?.charAt(0).toUpperCase() || <UserIcon size={14} />}
            </span>
          )}
          <span className="truncate">
            {user?.displayName || "Account"}
          </span>
        </Link>
        <Link
          to="/preferences"
          className="p-2 rounded-lg text-dark-50 hover:bg-dark-200 hover:text-surface-200 transition-colors"
          aria-label="Preferences"
        >
          <Settings size={16} />
        </Link>
      </div>
    </div>
  );
});

Sidebar.displayName = "Sidebar";
export default Sidebar;
