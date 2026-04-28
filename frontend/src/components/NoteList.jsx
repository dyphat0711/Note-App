import React, { useState, useCallback } from "react";
import {
  Search,
  Grid3X3,
  List,
  Pin,
  Lock,
  Trash2,
  FileText,
} from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import useNoteStore from "../store/useNoteStore";

const NoteList = React.memo(({ onOpenNote, onDeleteNote }) => {
  const viewMode = useNoteStore((s) => s.viewMode);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const selectedLabel = useNoteStore((s) => s.selectedLabel);
  const selectedFolder = useNoteStore((s) => s.selectedFolder);
  const activeSection = useNoteStore((s) => s.activeSection);
  const labels = useNoteStore((s) => s.labels);
  const folders = useNoteStore((s) => s.folders);
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setViewMode = useNoteStore((s) => s.setViewMode);
  const setSearchQuery = useNoteStore((s) => s.setSearchQuery);
  const togglePin = useNoteStore((s) => s.togglePin);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);

  React.useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  const filteredNotes = React.useMemo(() => {
    let filtered = [...notes];

    if (activeSection === "favorites") {
      filtered = filtered.filter((n) => n.isPinned);
    } else if (activeSection === "trash" || activeSection === "archived") {
      filtered = [];
    }

    if (selectedFolder) {
      filtered = filtered.filter((n) => n.folderId === selectedFolder);
    }

    if (selectedLabel) {
      filtered = filtered.filter((n) =>
        (n.labels || []).some((l) => l.id === selectedLabel),
      );
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          (n.content && !n.hasPassword && n.content.toLowerCase().includes(q)),
      );
    }

    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned && a.pinnedAt && b.pinnedAt)
        return new Date(b.pinnedAt) - new Date(a.pinnedAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return filtered;
  }, [notes, activeSection, selectedFolder, selectedLabel, debouncedSearch]);

  const cardPalette = React.useMemo(
    () => [
      "bg-sky-50 border-sky-100",
      "bg-rose-50 border-rose-100",
      "bg-amber-50 border-amber-100",
      "bg-indigo-50 border-indigo-100",
      "bg-emerald-50 border-emerald-100",
      "bg-violet-50 border-violet-100",
    ],
    [],
  );

  const sectionTitle = React.useMemo(() => {
    if (activeSection === "recents") {
      if (selectedFolder) {
        const folder = folders.find((f) => f.id === selectedFolder);
        return folder?.name || "Notes";
      }
      if (selectedLabel) {
        const label = labels.find((l) => l.id === selectedLabel);
        return label?.name || "Notes";
      }
      return "All Notes";
    }
    return activeSection.charAt(0).toUpperCase() + activeSection.slice(1);
  }, [activeSection, selectedFolder, selectedLabel, folders, labels]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getExcerpt = (content, maxLength = 80) => {
    if (!content) return "";
    const clean = content
      .replace(/<[^>]*>/g, " ")
      .replace(/[#*`_~>\-\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return clean.length > maxLength
      ? clean.substring(0, maxLength) + "..."
      : clean;
  };

  const handlePinToggle = useCallback(
    (e, noteId) => {
      e.stopPropagation();
      togglePin(noteId);
    },
    [togglePin],
  );

  const handleDeleteClick = useCallback(
    (e, note) => {
      e.stopPropagation();
      onDeleteNote(note);
    },
    [onDeleteNote],
  );

  const isGrid = viewMode === "grid";

  return (
    <div
      className={`flex-shrink-0 bg-dark-400 border-r border-dark-300 flex flex-col h-full ${
        isGrid ? "w-[420px]" : "w-80"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-dark-300">
        <h2 className="text-lg font-semibold text-surface-100 mb-3">
          {sectionTitle}
        </h2>

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-50 pointer-events-none"
          />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-sm text-surface-200 placeholder-dark-50 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-transparent transition-all duration-150"
            aria-label="Search notes"
          />
        </div>

        <div className="flex items-center gap-1 bg-dark-200 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === "list"
                ? "bg-dark-100 text-surface-100"
                : "text-dark-50 hover:text-surface-200"
            }`}
            aria-label="List view"
          >
            <List size={14} />
            List
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === "grid"
                ? "bg-dark-100 text-surface-100"
                : "text-dark-50 hover:text-surface-200"
            }`}
            aria-label="Grid view"
          >
            <Grid3X3 size={14} />
            Grid
          </button>
        </div>
      </div>

      {/* Note List */}
      <div
        className={`flex-1 overflow-y-auto p-3 ${
          isGrid ? "grid grid-cols-2 gap-3 auto-rows-min" : "space-y-2"
        }`}
      >
        {filteredNotes.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center py-12 text-dark-50 ${
              isGrid ? "col-span-2" : ""
            }`}
          >
            <FileText size={32} className="mb-3 opacity-50" />
            <p className="text-sm">No notes found</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isGrid={isGrid}
              isActive={note.id === activeNoteId}
              onOpen={onOpenNote}
              onTogglePin={handlePinToggle}
              onDelete={handleDeleteClick}
              formatDate={formatDate}
              getExcerpt={getExcerpt}
              paletteClass={
                cardPalette[Math.abs(Number(note.id) || 0) % cardPalette.length]
              }
            />
          ))
        )}
      </div>
    </div>
  );
});

const NoteCard = React.memo(
  ({
    note,
    isGrid,
    isActive,
    onOpen,
    onTogglePin,
    onDelete,
    formatDate,
    getExcerpt,
    paletteClass,
  }) => {
    return (
      <div
        onClick={() => onOpen(note.id)}
        className={`group relative rounded-xl cursor-pointer transition-all duration-150 border shadow-dark ${
          isGrid
            ? `${paletteClass} p-4 hover:shadow-dark-lg flex flex-col min-h-[140px]`
            : `p-3 ${
                isActive
                  ? "bg-accent-50 border-accent-200"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-dark"
              }`
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen(note.id)}
      >
        <div className={`flex ${isGrid ? "flex-col flex-1" : "items-start gap-3"}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className={`font-semibold text-surface-100 truncate flex-1 ${
                  isGrid ? "text-sm" : "text-sm"
                }`}
              >
                {note.title || "Untitled"}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {note.isPinned && <Pin size={12} className="text-accent-400" />}
                {note.hasPassword && (
                  <Lock size={12} className="text-amber-500" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-slate-500">
                {formatDate(note.updatedAt)}
              </span>
            </div>

            {isGrid ? (
              <p className="text-xs text-slate-600 line-clamp-4 mb-2">
                {note.hasPassword ? "🔒 Locked" : getExcerpt(note.content, 160)}
              </p>
            ) : (
              <p className="text-xs text-slate-600 truncate">
                {note.hasPassword ? "🔒 Locked" : getExcerpt(note.content)}
              </p>
            )}

            {(note.labels || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                {note.labels.slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                {note.labels.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-dark-50">
                    +{note.labels.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => onTogglePin(e, note.id)}
              className={`p-1.5 rounded-md transition-colors ${
                note.isPinned
                  ? "text-accent-600 hover:bg-white/60"
                  : "text-slate-500 hover:text-surface-200 hover:bg-white/60"
              }`}
              aria-label={note.isPinned ? "Unpin" : "Pin"}
            >
              <Pin size={14} />
            </button>
            <button
              onClick={(e) => onDelete(e, note)}
              className="p-1.5 rounded-md text-slate-500 hover:text-danger-600 hover:bg-white/60 transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  },
);

NoteCard.displayName = "NoteCard";
NoteList.displayName = "NoteList";
export default NoteList;
