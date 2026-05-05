import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search,
  Grid3X3,
  List,
  Pin,
  Lock,
  Trash2,
  FileText,
  Users,
} from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import useNoteStore from "../store/useNoteStore";
import { noteAPI } from "../api/services";

function transformNoteFromApi(n) {
  return {
    id: n.id,
    userId: n.user_id,
    title: n.title,
    content: n.content,
    isPinned: Boolean(n.is_pinned),
    pinnedAt: n.pinned_at,
    hasPassword: Boolean(n.has_password),
    isShared: Boolean(n.is_shared),
    isOwner: n.is_owner ?? true,
    sharePermission: n.share_permission ?? null,
    owner: n.owner || null,
    labels: (n.labels || []).map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color || "#3b82f6",
    })),
    shares: n.shares || [],
    attachments: n.attachments || [],
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

const NoteList = React.memo(({ onOpenNote, onDeleteNote }) => {
  const viewMode = useNoteStore((s) => s.viewMode);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const selectedLabelIds = useNoteStore((s) => s.selectedLabelIds);
  const activeSection = useNoteStore((s) => s.activeSection);
  const labels = useNoteStore((s) => s.labels);
  const notes = useNoteStore((s) => s.notes);
  const sharedNotes = useNoteStore((s) => s.sharedNotes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setViewMode = useNoteStore((s) => s.setViewMode);
  const setSearchQuery = useNoteStore((s) => s.setSearchQuery);
  const togglePin = useNoteStore((s) => s.togglePin);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300); // spec: 300ms live search
  const [serverSearchResults, setServerSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Server-side search when query is non-empty (spec #17: search title + content).
  useEffect(() => {
    let cancelled = false;
    if (!debouncedSearch.trim()) {
      setServerSearchResults(null);
      return () => {
        cancelled = true;
      };
    }
    setSearching(true);
    noteAPI
      .search(debouncedSearch)
      .then(({ data }) => {
        if (!cancelled) {
          setServerSearchResults((data.data || []).map(transformNoteFromApi));
        }
      })
      .catch(() => {
        if (!cancelled) setServerSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const sourceNotes = useMemo(() => {
    if (activeSection === "shared") return sharedNotes;
    if (debouncedSearch.trim() && serverSearchResults) return serverSearchResults;
    return notes;
  }, [activeSection, sharedNotes, debouncedSearch, serverSearchResults, notes]);

  const filteredNotes = useMemo(() => {
    let filtered = [...sourceNotes];

    if (activeSection === "favorites") {
      filtered = filtered.filter((n) => n.isPinned);
    }

    if (selectedLabelIds.length > 0) {
      filtered = filtered.filter((n) =>
        (n.labels || []).some((l) => selectedLabelIds.includes(l.id)),
      );
    }

    filtered.sort((a, b) => {
      // Spec #16: pinned first; among pinned by pinnedAt desc; else by updatedAt desc.
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) {
        const ap = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bp = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        if (ap !== bp) return bp - ap;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return filtered;
  }, [sourceNotes, activeSection, selectedLabelIds]);

  const sectionTitle = useMemo(() => {
    if (activeSection === "favorites") return "Pinned";
    if (activeSection === "shared") return "Shared with me";
    if (selectedLabelIds.length > 0) {
      const names = labels
        .filter((l) => selectedLabelIds.includes(l.id))
        .map((l) => l.name);
      return names.length === 1 ? names[0] : `${names.length} labels`;
    }
    return "All Notes";
  }, [activeSection, selectedLabelIds, labels]);

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
    const clean = String(content)
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-surface-100 truncate">
            {sectionTitle}
          </h2>
          {activeSection === "shared" && (
            <span className="flex items-center gap-1 text-xs text-dark-50">
              <Users size={12} />
              {sharedNotes.length}
            </span>
          )}
        </div>

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-50 pointer-events-none"
          />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-sm text-surface-200 placeholder-dark-50 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-transparent transition-all duration-150"
            aria-label="Search notes"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-accent-500 border-t-transparent rounded-full" />
          )}
        </div>

        <div className="flex items-center gap-1 bg-dark-200 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === "grid"
                ? "bg-dark-100 text-surface-100"
                : "text-dark-50 hover:text-surface-200"
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <Grid3X3 size={14} />
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              viewMode === "list"
                ? "bg-dark-100 text-surface-100"
                : "text-dark-50 hover:text-surface-200"
            }`}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <List size={14} />
            List
          </button>
        </div>
      </div>

      {/* Note List */}
      <div
        className={`flex-1 overflow-y-auto p-3 ${
          isGrid ? "grid grid-cols-2 gap-3 auto-rows-min" : "space-y-2"
        }`}
        role="list"
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
          filteredNotes.map((note, idx) => (
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
              paletteIndex={idx % CARD_PALETTE.length}
            />
          ))
        )}
      </div>
    </div>
  );
});

const CARD_PALETTE = [
  "bg-sky-50 border-sky-100",
  "bg-rose-50 border-rose-100",
  "bg-amber-50 border-amber-100",
  "bg-indigo-50 border-indigo-100",
  "bg-emerald-50 border-emerald-100",
  "bg-violet-50 border-violet-100",
];

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
    paletteIndex,
  }) => {
    const paletteClass = CARD_PALETTE[paletteIndex];
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
        role="listitem"
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
                {note.isPinned && (
                  <Pin
                    size={12}
                    className="text-accent-500"
                    aria-label="Pinned"
                  />
                )}
                {note.hasPassword && (
                  <Lock
                    size={12}
                    className="text-amber-500"
                    aria-label="Password protected"
                  />
                )}
                {note.isShared && (
                  <Users
                    size={12}
                    className="text-blue-500"
                    aria-label="Shared"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-slate-500">
                {formatDate(note.updatedAt)}
              </span>
              {!note.isOwner && note.owner && (
                <span className="text-xs text-blue-500 truncate">
                  · from {note.owner.display_name || note.owner.email}
                </span>
              )}
              {note.sharePermission && (
                <span className="text-[10px] uppercase font-semibold text-blue-500/80">
                  {note.sharePermission}
                </span>
              )}
            </div>

            {isGrid ? (
              <p className="text-xs text-slate-600 line-clamp-4 mb-2">
                {note.hasPassword
                  ? "🔒 Locked"
                  : getExcerpt(note.content, 160)}
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
                  <span className="px-2 py-0.5 text-xs text-slate-500">
                    +{note.labels.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {note.isOwner && (
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
          )}
        </div>
      </div>
    );
  },
);

NoteCard.displayName = "NoteCard";
NoteList.displayName = "NoteList";
export default NoteList;
