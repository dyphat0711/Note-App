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
  Eye,
  Edit3,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import useNoteStore, { transformNote } from "../store/useNoteStore";
import { noteAPI } from "../api/services";

// ── Module-level utilities (stable references, never break React.memo) ──

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getExcerpt(content, maxLength = 80) {
  if (!content) return "";
  const clean = String(content)
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*`_~>\-\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > maxLength
    ? clean.substring(0, maxLength) + "..."
    : clean;
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
  const toggleLabelFilter = useNoteStore((s) => s.toggleLabelFilter);
  const clearLabelFilters = useNoteStore((s) => s.clearLabelFilters);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);
  const [serverSearchResults, setServerSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedSearch.trim()) {
      setServerSearchResults(null);
      return () => { cancelled = true; };
    }
    setSearching(true);
    noteAPI
      .search(debouncedSearch)
      .then(({ data }) => {
        if (!cancelled) {
          setServerSearchResults((data.data || []).map(transformNote));
        }
      })
      .catch(() => {
        if (!cancelled) setServerSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  const sourceNotes = useMemo(() => {
    if (activeSection === "shared") return Array.isArray(sharedNotes) ? sharedNotes : [];
    if (debouncedSearch.trim() && serverSearchResults) return Array.isArray(serverSearchResults) ? serverSearchResults : [];
    return Array.isArray(notes) ? notes : [];
  }, [activeSection, sharedNotes, debouncedSearch, serverSearchResults, notes]);

  const filteredNotes = useMemo(() => {
    let filtered = [...sourceNotes].filter(n => n !== null && n !== undefined);

    if (activeSection === "favorites") {
      filtered = filtered.filter((n) => n.isPinned);
    }

    if (selectedLabelIds.length > 0) {
      filtered = filtered.filter((n) =>
        (n.labels || []).some((l) => selectedLabelIds.includes(l.id)),
      );
    }

    // Cache parsed timestamps to avoid repeated Date parsing in O(n log n) comparisons
    const tsCache = new Map();
    const getTs = (str) => {
      if (!str) return 0;
      let ts = tsCache.get(str);
      if (ts === undefined) { ts = new Date(str).getTime(); tsCache.set(str, ts); }
      return ts;
    };

    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) {
        const ap = getTs(a.pinnedAt);
        const bp = getTs(b.pinnedAt);
        if (ap !== bp) return bp - ap;
      }
      return getTs(b.updatedAt) - getTs(a.updatedAt);
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

  // formatDate, formatRelativeDate, getExcerpt are now module-level
  // so they have stable references and don't break child React.memo

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
  const isSharedSection = activeSection === "shared";

  return (
    <div
      className={`flex-shrink-0 flex flex-col h-full note-list-panel w-full ${
        isGrid ? "sm:w-[380px] md:w-[420px]" : "sm:w-72 md:w-80"
      }`}
      style={{
        background: "rgb(var(--dark-400))",
        borderRight: "1px solid rgba(var(--dark-300), 0.8)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3.5"
        style={{ borderBottom: "1px solid rgba(var(--dark-300), 0.8)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-surface-100 truncate">
            {sectionTitle}
          </h2>
          {isSharedSection && (
            <span
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(var(--dark-200), 0.8)", color: "rgb(var(--dark-50))" }}
            >
              <Users size={11} />
              {sharedNotes.length}
            </span>
          )}
        </div>

        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-50 pointer-events-none"
          />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 text-sm text-surface-200 placeholder-dark-50 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-all duration-200 rounded-xl"
            style={{
              background: "rgba(var(--dark-200), 0.9)",
              border: "1px solid rgba(var(--dark-100), 0.6)",
            }}
            aria-label="Search notes"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-accent-500 border-t-transparent rounded-full" />
          )}
        </div>

        {/* ── Label chip bar (hidden when in Shared section or no labels) ── */}
        {activeSection !== "shared" && labels.length > 0 && (
          <div
            className="flex items-center gap-1.5 mt-2.5 -mx-1 px-1 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {/* "All" chip — clears filter */}
            <button
              onClick={clearLabelFilters}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                selectedLabelIds.length === 0
                  ? "text-accent-400"
                  : "text-dark-50 hover:text-surface-200"
              }`}
              style={{
                background: selectedLabelIds.length === 0
                  ? "rgba(99,102,241,0.15)"
                  : "rgba(var(--dark-200), 0.7)",
                borderColor: selectedLabelIds.length === 0
                  ? "rgba(99,102,241,0.4)"
                  : "rgba(var(--dark-100), 0.5)",
              }}
            >
              All
            </button>

            {labels.map((label) => {
              const isActive = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => toggleLabelFilter(label.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border"
                  style={{
                    background: isActive
                      ? `${label.color}22`
                      : "rgba(var(--dark-200), 0.7)",
                    borderColor: isActive
                      ? `${label.color}88`
                      : "rgba(var(--dark-100), 0.5)",
                    color: isActive ? label.color : "rgb(var(--dark-50))",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              );
            })}
          </div>
        )}

        <div
          className="flex items-center gap-0.5 p-0.5 rounded-xl mt-2.5"
          style={{ background: "rgba(var(--dark-200), 0.8)" }}
        >
          {[
            { mode: "grid", icon: Grid3X3, label: "Grid" },
            { mode: "list", icon: List,    label: "List" },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all duration-200 ${
                viewMode === mode
                  ? "text-surface-100 shadow-sm"
                  : "text-dark-50 hover:text-surface-200"
              }`}
              style={viewMode === mode ? { background: "rgb(var(--dark-100))" } : {}}
              aria-label={`${label} view`}
              aria-pressed={viewMode === mode}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Note List */}
      <div
        className={`flex-1 overflow-y-auto p-3 ${
          isGrid ? "grid grid-cols-2 gap-2.5 auto-rows-min" : "space-y-1.5"
        }`}
        role="list"
      >
        {filteredNotes.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center py-14 text-dark-50 animate-fade-in-up ${
              isGrid ? "col-span-2" : ""
            }`}
          >
            <FileText size={28} className="mb-3 opacity-30" />
            <p className="text-sm text-dark-50/70">No notes found</p>
          </div>
        ) : (
          filteredNotes.map((note, idx) =>
            isSharedSection ? (
              <SharedNoteCard
                key={note.id}
                note={note}
                isGrid={isGrid}
                isActive={note.id === activeNoteId}
                onOpen={onOpenNote}
                formatDate={formatDate}
                formatRelativeDate={formatRelativeDate}
                getExcerpt={getExcerpt}
                index={idx}
              />
            ) : (
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
                index={idx}
              />
            )
          )
        )}
      </div>
    </div>
  );
});


/* ── SharedNoteCard: dedicated card for the "Shared with me" section ── */
const SharedNoteCard = React.memo(
  ({
    note,
    isGrid,
    isActive,
    onOpen,
    formatDate,
    formatRelativeDate,
    getExcerpt,
    index = 0,
  }) => {
    const canEdit = note.sharePermission === "edit";
    const ownerName = note.owner?.display_name || note.owner?.email || "Unknown";
    const ownerInitial = ownerName.charAt(0).toUpperCase();
    const ownerAvatarPath = note.owner?.avatar_path;

    return (
      <div
        onClick={() => onOpen(note.id)}
        className={`note-list-item group relative rounded-xl cursor-pointer border note-card-hover animate-fade-in-up ${
          isGrid
            ? "p-4 flex flex-col min-h-[160px]"
            : `p-3 ${isActive ? "ring-1.5 ring-accent-400" : ""}`
        }`}
        style={{
          background: isActive
            ? "rgba(var(--dark-100), 0.9)"
            : "rgba(var(--dark-200), 0.85)",
          borderColor: isActive
            ? "rgba(99,102,241,0.5)"
            : "rgba(var(--dark-100), 0.6)",
          boxShadow: isActive ? "0 0 0 1px rgba(99,102,241,0.4)" : undefined,
          borderLeft: canEdit
            ? "3px solid rgba(59, 130, 246, 0.7)"
            : "3px solid rgba(148, 163, 184, 0.4)",
          animationDelay: `${Math.min(index * 40, 200)}ms`,
        }}
        role="listitem"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen(note.id)}
      >
        {/* Permission badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={`shared-permission-badge ${canEdit ? "shared-permission-edit" : "shared-permission-read"}`}
          >
            {canEdit ? (
              <>
                <Edit3 size={10} />
                <span>Can Edit</span>
              </>
            ) : (
              <>
                <Eye size={10} />
                <span>Read Only</span>
              </>
            )}
          </span>

          {/* Icons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {note.hasPassword && (
              <Lock size={12} className="text-amber-500" aria-label="Password protected" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-surface-100 truncate mb-1">
          {note.title || "Untitled"}
        </h3>

        {/* Excerpt */}
        {isGrid ? (
          <p className="text-xs note-card-excerpt line-clamp-3 mb-2">
            {note.hasPassword ? "🔒 Locked" : getExcerpt(note.content, 120)}
          </p>
        ) : (
          <p className="text-xs note-card-excerpt truncate mb-2">
            {note.hasPassword ? "🔒 Locked" : getExcerpt(note.content)}
          </p>
        )}

        {/* Shared by + date info */}
        <div className="mt-auto pt-2" style={{ borderTop: "1px solid rgba(var(--dark-100), 0.4)" }}>
          {/* Owner row */}
          <div className="flex items-center gap-2 mb-1">
            {ownerAvatarPath ? (
              <img
                src={`/storage/${ownerAvatarPath}`}
                alt={ownerName}
                className="w-4.5 h-4.5 rounded-full object-cover flex-shrink-0"
                style={{ width: "18px", height: "18px" }}
              />
            ) : (
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  width: "18px",
                  height: "18px",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "rgb(96, 165, 250)",
                }}
              >
                {ownerInitial}
              </span>
            )}
            <span className="text-xs text-blue-400 truncate">
              {ownerName}
            </span>
          </div>

          {/* Shared date */}
          <div className="flex items-center gap-1.5 text-[10px] text-dark-50">
            <Clock size={9} className="flex-shrink-0 opacity-60" />
            <span>
              Shared {formatRelativeDate(note.sharedAt || note.createdAt)}
            </span>
            {note.updatedAt && (
              <>
                <span className="opacity-40">·</span>
                <span>Updated {formatDate(note.updatedAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Labels */}
        {(Array.isArray(note.labels) ? note.labels : []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(Array.isArray(note.labels) ? note.labels : []).slice(0, 3).map((label) => (
              <span
                key={label.id}
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${label.color}25`,
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
            {note.labels.length > 3 && (
              <span className="px-2 py-0.5 text-xs note-card-date">
                +{note.labels.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);


/* ── NoteCard: standard card for own notes ── */
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
    index = 0,
  }) => {
    const hasCustomColor = Boolean(note.color);
    const customStyle = hasCustomColor
      ? { backgroundColor: note.color, borderColor: `${note.color}cc` }
      : {};

    const titleStyle   = hasCustomColor ? { color: "#1e293b" } : undefined;
    const metaStyle    = hasCustomColor ? { color: "#64748b" } : undefined;
    const excerptStyle = hasCustomColor ? { color: "#475569" } : undefined;

    return (
      <div
        onClick={() => onOpen(note.id)}
        className={`note-list-item group relative rounded-xl cursor-pointer border note-card-hover animate-fade-in-up ${
          isGrid
            ? "p-4 flex flex-col min-h-[136px]"
            : `p-3 ${isActive ? "ring-1.5 ring-accent-400" : ""}`
        } ${hasCustomColor ? "" : ""}`}
        style={{
          ...customStyle,
          ...(!hasCustomColor ? {
            background: isActive
              ? "rgba(var(--dark-100), 0.9)"
              : "rgba(var(--dark-200), 0.85)",
            borderColor: isActive
              ? "rgba(99,102,241,0.5)"
              : "rgba(var(--dark-100), 0.6)",
            boxShadow: isActive ? "0 0 0 1px rgba(99,102,241,0.4)" : undefined,
          } : {}),
          animationDelay: `${Math.min(index * 40, 200)}ms`,
        }}
        role="listitem"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen(note.id)}
      >
        <div className={`flex ${isGrid ? "flex-col flex-1" : "items-start gap-3"}`}>
          <div className="flex-1 min-w-0">

            {/* Title row */}
            <div className="flex items-center gap-2 mb-1">
              <h3
                className={`font-semibold text-sm truncate flex-1 ${!hasCustomColor ? "text-surface-100" : ""}`}
                style={titleStyle}
              >
                {note.title || "Untitled"}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {note.isPinned && (
                  <Pin size={12} style={hasCustomColor ? { color: "#3b82f6" } : undefined}
                    className={!hasCustomColor ? "text-accent-500" : ""}
                    aria-label="Pinned" />
                )}
                {note.hasPassword && (
                  <Lock size={12} className="text-amber-500" aria-label="Password protected" />
                )}
                {note.isShared && (
                  <Users size={12} className="text-blue-500" aria-label="Shared" />
                )}
              </div>
            </div>

            {/* Date row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-xs ${!hasCustomColor ? "note-card-date" : ""}`}
                style={metaStyle}
              >
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

            {/* Excerpt */}
            {isGrid ? (
              <p
                className={`text-xs line-clamp-4 mb-2 ${!hasCustomColor ? "note-card-excerpt" : ""}`}
                style={excerptStyle}
              >
                {note.hasPassword ? "🔒 Locked" : getExcerpt(note.content, 160)}
              </p>
            ) : (
              <p
                className={`text-xs truncate ${!hasCustomColor ? "note-card-excerpt" : ""}`}
                style={excerptStyle}
              >
                {note.hasPassword ? "🔒 Locked" : getExcerpt(note.content)}
              </p>
            )}

            {/* Labels */}
            {(Array.isArray(note.labels) ? note.labels : []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                {(Array.isArray(note.labels) ? note.labels : []).slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${label.color}25`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                {note.labels.length > 3 && (
                  <span
                    className={`px-2 py-0.5 text-xs ${!hasCustomColor ? "note-card-date" : ""}`}
                    style={metaStyle}
                  >
                    +{note.labels.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons (visible on hover) */}
          {note.isOwner && (
            <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => onTogglePin(e, note.id)}
                className="p-1.5 rounded-md transition-colors hover:bg-black/10"
                style={{
                  color: note.isPinned
                    ? "#3b82f6"
                    : (hasCustomColor ? "#64748b" : undefined),
                }}
                aria-label={note.isPinned ? "Unpin" : "Pin"}
              >
                <Pin size={14} />
              </button>
              <button
                onClick={(e) => onDelete(e, note)}
                className="p-1.5 rounded-md transition-colors hover:text-danger-500 hover:bg-black/10"
                style={hasCustomColor ? { color: "#64748b" } : undefined}
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

SharedNoteCard.displayName = "SharedNoteCard";
NoteCard.displayName = "NoteCard";
NoteList.displayName = "NoteList";
export default NoteList;
