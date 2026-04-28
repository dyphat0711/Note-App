import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Plus,
  Star,
  Trash2,
  Archive,
  Folder,
  FolderPlus,
  X,
  Edit3,
  Check,
} from "lucide-react";
import useNoteStore from "../store/useNoteStore";

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
            onClick={() => {
              setCustom(c);
              onChange(c);
            }}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
              value === c ? "border-white scale-110" : "border-transparent"
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
    folders,
    labels,
    activeSection,
    selectedLabel,
    selectedFolder,
    setActiveSection,
    setSelectedLabel,
    setSelectedFolder,
    createNote,
    createFolder,
    updateFolder,
    deleteFolder,
    addLabel,
    updateLabel,
    deleteLabel,
  } = useNoteStore();

  // Folder state
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderName, setEditFolderName] = useState("");

  // Label state
  const [showNewLabelInput, setShowNewLabelInput] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("#3b82f6");
  const [showColorPickerFor, setShowColorPickerFor] = useState(null); // "new" | label.id | null

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

  const navItems = [
    { id: "recents", label: "All Notes", icon: FileText },
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "trash", label: "Trash", icon: Trash2 },
    { id: "archived", label: "Archived", icon: Archive },
  ];

  // --- Folder handlers ---
  const handleNewFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolderInput(false);
    }
  };

  const startEditFolder = (folder) => {
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
  };

  const saveEditFolder = async () => {
    if (editFolderName.trim() && editingFolderId) {
      await updateFolder(editingFolderId, editFolderName.trim());
      setEditingFolderId(null);
    }
  };

  const handleDeleteFolder = async (id) => {
    await deleteFolder(id);
  };

  // --- Label handlers ---
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
  };

  const navItemClass = (id) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
      activeSection === id && !selectedLabel && !selectedFolder
        ? "bg-accent-500/20 text-accent-400"
        : "text-dark-50 hover:bg-dark-200 hover:text-surface-200"
    }`;

  const folderItemClass = (id) =>
    `flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
      selectedFolder === id
        ? "bg-accent-500/20 text-accent-400"
        : "text-dark-50 hover:bg-dark-200 hover:text-surface-200"
    }`;

  const labelItemClass = (id) =>
    `flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
      selectedLabel === id
        ? "bg-accent-500/20 text-accent-400"
        : "text-dark-50 hover:bg-dark-200 hover:text-surface-200"
    }`;

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

      {/* New Note Button */}
      <div className="px-3 py-3">
        <button
          onClick={createNote}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-medium transition-colors duration-150"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6">
        {/* Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full ${navItemClass(item.id)}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Folders */}
        <div>
          <div className="flex items-center justify-between px-3 py-1.5 mb-1">
            <span className="text-xs font-medium text-dark-50 uppercase tracking-wide">
              Folders
            </span>
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="text-dark-50 hover:text-surface-200 transition-colors"
              aria-label="Add folder"
            >
              <FolderPlus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {showNewFolderInput && (
              <div className="flex items-center gap-2 px-3 py-1.5">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNewFolder();
                    if (e.key === "Escape") setShowNewFolderInput(false);
                  }}
                  placeholder="Folder name..."
                  className="flex-1 px-2 py-1 text-xs bg-dark-200 border border-dark-100 rounded text-surface-200 placeholder-dark-50 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  autoFocus
                />
                <button
                  onClick={handleNewFolder}
                  className="text-accent-400 hover:text-accent-500"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setShowNewFolderInput(false)}
                  className="text-dark-50 hover:text-surface-200"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                {editingFolderId === folder.id ? (
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <input
                      type="text"
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditFolder();
                        if (e.key === "Escape") setEditingFolderId(null);
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-dark-200 border border-dark-100 rounded text-surface-200 focus:outline-none focus:ring-1 focus:ring-accent-500"
                      autoFocus
                    />
                    <button
                      onClick={saveEditFolder}
                      className="text-accent-400 hover:text-accent-500"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full ${folderItemClass(folder.id)}`}
                  >
                    <Folder size={16} />
                    <span className="flex-1 text-left truncate">
                      {folder.name}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditFolder(folder);
                        }}
                        className="p-0.5 text-dark-50 hover:text-surface-200 transition-colors"
                        aria-label="Rename folder"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="p-0.5 text-dark-50 hover:text-danger-400 transition-colors"
                        aria-label="Delete folder"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Labels */}
        <div>
          <div className="flex items-center justify-between px-3 py-1.5 mb-1">
            <span className="text-xs font-medium text-dark-50 uppercase tracking-wide">
              Labels
            </span>
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
          <div className="space-y-0.5">
            {showNewLabelInput && (
              <div className="px-3 py-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative" ref={showColorPickerFor === "new" ? colorPickerRef : undefined}>
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
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewLabelInput(false);
                      setShowColorPickerFor(null);
                    }}
                    className="text-dark-50 hover:text-surface-200"
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
                      <div className="relative" ref={showColorPickerFor === label.id ? colorPickerRef : undefined}>
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
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedLabel(label.id)}
                    className={`w-full ${labelItemClass(label.id)}`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-left truncate">
                      {label.name}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditLabel(label);
                        }}
                        className="p-0.5 text-dark-50 hover:text-surface-200 transition-colors"
                        aria-label="Edit label"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLabel(label.id);
                        }}
                        className="p-0.5 text-dark-50 hover:text-danger-400 transition-colors"
                        aria-label="Delete label"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

Sidebar.displayName = "Sidebar";
export default Sidebar;
