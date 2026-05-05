import React, { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  RefreshCw,
  Mail,
  AlertTriangle,
} from "lucide-react";
import useNoteStore from "../store/useNoteStore";
import useAuthStore from "../store/useAuthStore";
import Sidebar from "../components/Sidebar";
import NoteList from "../components/NoteList";
import NoteEditor from "../components/NoteEditor";
import ConfirmationModal from "../components/ConfirmationModal";
import UnlockOverlay from "../components/UnlockOverlay";
import { useOfflineSync } from "../hooks/useOfflineSync";
import toast from "react-hot-toast";

const SkeletonCard = () => (
  <div className="rounded-xl bg-dark-300/40 border border-dark-300 p-4 animate-pulse h-28" />
);

const Dashboard = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resendVerification = useAuthStore((s) => s.resendVerification);

  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const notes = useNoteStore((s) => s.notes);
  const sharedNotes = useNoteStore((s) => s.sharedNotes);
  const isLoading = useNoteStore((s) => s.isLoading);
  const unlockedNoteIds = useNoteStore((s) => s.unlockedNoteIds);
  const fetchAll = useNoteStore((s) => s.fetchAll);

  const activeNote =
    notes.find((n) => n.id === activeNoteId) ||
    sharedNotes.find((n) => n.id === activeNoteId) ||
    null;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);

  const { isOnline, pendingCount, syncing, hydrateFromCache, flushQueue } =
    useOfflineSync();

  useEffect(() => {
    fetchAll().catch(() => hydrateFromCache());
  }, [fetchAll, hydrateFromCache]);

  const handleOpenNote = useCallback((noteId) => {
    useNoteStore.getState().setActiveNote(noteId);
  }, []);

  const handleDeleteNote = useCallback((note) => {
    setDeleteTarget(note);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteTarget) {
      await useNoteStore.getState().deleteNote(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Note deleted");
    }
  }, [deleteTarget]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const handleResend = useCallback(async () => {
    const r = await resendVerification();
    if (r.success) toast.success("Verification email sent");
    else toast.error(r.message || "Failed to send verification email");
  }, [resendVerification]);

  // Spec #21 password lock: a note shows the unlock overlay until decrypted client-side.
  const needsUnlock =
    activeNote?.hasPassword && !unlockedNoteIds.has(activeNote.id);

  const showVerifyBanner =
    user && !user.isVerified && !verifyBannerDismissed;

  return (
    <div className="h-screen flex flex-col bg-dark-500 overflow-hidden">
      {showVerifyBanner && (
        <div className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-2 text-amber-300 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span className="truncate">
              Please verify your email <strong className="font-semibold">{user.email}</strong> to secure your account.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
            >
              <Mail size={12} />
              Resend
            </button>
            <button
              onClick={() => setVerifyBannerDismissed(true)}
              className="text-amber-300/70 hover:text-amber-200"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto transition-transform duration-200 ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
          }`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
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
              {!isOnline && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300">
                  <WifiOff size={12} />
                  Offline
                </span>
              )}
              {isOnline && pendingCount > 0 && (
                <button
                  onClick={flushQueue}
                  disabled={syncing}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors disabled:opacity-60"
                  title="Sync pending changes"
                >
                  <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing…" : `${pendingCount} pending`}
                </button>
              )}
              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-200 transition-colors">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 text-xs font-medium">
                      {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm text-surface-200">
                    {user?.displayName || "User"}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-52 bg-dark-200 border border-dark-100 rounded-lg shadow-dark-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  <div className="px-4 py-2 border-b border-dark-300">
                    <p className="text-sm font-medium text-surface-100 truncate">
                      {user?.displayName || "User"}
                    </p>
                    <p className="text-xs text-dark-50 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-surface-200 hover:bg-dark-100 transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/preferences"
                    className="block px-4 py-2 text-sm text-surface-200 hover:bg-dark-100 transition-colors"
                  >
                    Preferences
                  </Link>
                  <Link
                    to="/change-password"
                    className="block px-4 py-2 text-sm text-surface-200 hover:bg-dark-100 transition-colors"
                  >
                    Change password
                  </Link>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-400 hover:bg-dark-100 transition-colors border-t border-dark-300 mt-1"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* List + editor */}
          <div className="flex-1 flex overflow-hidden">
            <NoteList
              onOpenNote={handleOpenNote}
              onDeleteNote={handleDeleteNote}
            />

            {isLoading ? (
              <div className="flex-1 p-6 grid gap-3 grid-cols-1">
                {[...Array(5)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : activeNote ? (
              needsUnlock ? (
                <UnlockOverlay note={activeNote} />
              ) : (
                <NoteEditor
                  note={activeNote}
                  onClose={() =>
                    useNoteStore.getState().setActiveNote(null)
                  }
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
      </div>

      {deleteTarget && (
        <ConfirmationModal
          isOpen={!!deleteTarget}
          title="Delete note"
          message={`Are you sure you want to delete "${deleteTarget.title || "Untitled"}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

export default Dashboard;
