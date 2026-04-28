import React, { useState, useCallback, useEffect } from "react";
import { Menu, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import useNoteStore from "../store/useNoteStore";
import useAuthStore from "../store/useAuthStore";
import Sidebar from "../components/Sidebar";
import NoteList from "../components/NoteList";
import NoteEditor from "../components/NoteEditor";
import ConfirmationModal from "../components/ConfirmationModal";
import UnlockOverlay from "../components/UnlockOverlay";

const Dashboard = () => {
  const { user, logout } = useAuthStore();
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const notes = useNoteStore((s) => s.notes);
  const isLoading = useNoteStore((s) => s.isLoading);
  const unlockedNoteIds = useNoteStore((s) => s.unlockedNoteIds);
  const fetchAll = useNoteStore((s) => s.fetchAll);

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleOpenNote = useCallback((noteId) => {
    useNoteStore.getState().setActiveNote(noteId);
  }, []);

  const handleDeleteNote = useCallback((note) => {
    setDeleteTarget(note);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      useNoteStore.getState().deleteNote(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const needsUnlock =
    activeNote?.hasPassword &&
    activeNote.content === null &&
    !unlockedNoteIds.has(activeNote.id);

  return (
    <div className="h-screen flex bg-dark-500 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto transition-transform duration-200 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex-shrink-0 h-12 bg-dark-600 border-b border-dark-300 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-colors"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <ChevronLeft size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
            <nav className="hidden sm:flex items-center gap-1 text-sm text-dark-50">
              <span>Notes</span>
              {activeNote && (
                <>
                  <ChevronRight size={12} />
                  <span className="text-surface-200 truncate max-w-[200px]">
                    {activeNote.title || "Untitled"}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-200 transition-colors">
                <div className="w-7 h-7 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 text-xs font-medium">
                  {user?.displayName?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="hidden sm:block text-sm text-surface-200">
                  {user?.displayName || "User"}
                </span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="px-4 py-2 border-b border-dark-300">
                  <p className="text-sm font-medium text-surface-100">
                    {user?.displayName || "User"}
                  </p>
                  <p className="text-xs text-dark-50">{user?.email}</p>
                </div>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-400 hover:bg-dark-100 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 2-Column Layout: Note List + Editor */}
        <div className="flex-1 flex overflow-hidden">
          <NoteList
            onOpenNote={handleOpenNote}
            onDeleteNote={handleDeleteNote}
          />

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-dark-500">
              <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" />
            </div>
          ) : activeNote ? (
            needsUnlock ? (
              <UnlockOverlay note={activeNote} />
            ) : (
              <NoteEditor
                note={activeNote}
                onClose={() => useNoteStore.getState().setActiveNote(null)}
              />
            )
          ) : (
            <div className="flex-1 bg-dark-500 flex flex-col items-center justify-center text-dark-50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-200 flex items-center justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-dark-100"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-display font-medium text-surface-200 mb-2">
                  Select a note to view
                </h3>
                <p className="text-sm max-w-xs">
                  Choose a note from the list on the left, or create a new one
                  to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmationModal
          isOpen={!!deleteTarget}
          title="Delete Note"
          message={`Are you sure you want to delete "${deleteTarget.title || "Untitled"}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

export default Dashboard;
