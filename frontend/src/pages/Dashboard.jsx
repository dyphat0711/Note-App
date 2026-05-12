import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  FileText,
  Star,
  Users,
  Plus,
} from "lucide-react";
import useNoteStore from "../store/useNoteStore";
import useAuthStore from "../store/useAuthStore";
import Sidebar from "../components/Sidebar";
import NoteList from "../components/NoteList";
import NoteEditor from "../components/NoteEditor";
import ErrorBoundary from "../components/ErrorBoundary";
import ConfirmationModal from "../components/ConfirmationModal";
import UnlockOverlay from "../components/UnlockOverlay";
import { useOfflineSync } from "../hooks/useOfflineSync";
import toast from "react-hot-toast";

const SkeletonCard = () => (
  <div className="rounded-xl border border-dark-300 p-4 h-28 skeleton-shimmer" />
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
  const createNote = useNoteStore((s) => s.createNote);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const activeSection = useNoteStore((s) => s.activeSection);
  const setActiveSection = useNoteStore((s) => s.setActiveSection);
  const refreshSharedWithMe = useNoteStore((s) => s.refreshSharedWithMe);

  const activeNote = useMemo(
    () =>
      notes.find((n) => n.id === activeNoteId) ||
      sharedNotes.find((n) => n.id === activeNoteId) ||
      null,
    [notes, sharedNotes, activeNoteId],
  );

  // On mobile (< lg breakpoint = 1024px) default to closed so returning from
  // Profile / Preferences / ChangePassword doesn't trigger the sidebar overlay.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  // Mobile: which panel is visible – "list" or "editor"
  const [mobilePanel, setMobilePanel] = useState("list");

  const { isOnline, pendingCount, syncing, lastSyncTime, hydrateFromCache, flushQueue } =
    useOfflineSync();

  useEffect(() => {
    fetchAll().catch((err) => {
      // Only hydrate from cache for network failures, not server errors.
      const isNetworkErr =
        !err?.response &&
        (err?.code === "ERR_NETWORK" || err?.message === "Network Error" || !navigator.onLine);
      if (isNetworkErr) hydrateFromCache();
    });
  }, [fetchAll, hydrateFromCache]);

  // On mobile, automatically switch to editor when a note is opened
  useEffect(() => {
    if (activeNoteId) setMobilePanel("editor");
  }, [activeNoteId]);

  // Restore the last-opened note when Dashboard mounts (e.g. returning from
  // Profile / Preferences / ChangePassword). activeNoteId may be null if
  // Zustand was re-initialized; localStorage gives us the reliable fallback.
  useEffect(() => {
    if (activeNoteId || notes.length === 0) return;

    const savedId = (() => {
      try { return localStorage.getItem("noteflow.lastActiveNoteId"); }
      catch { return null; }
    })();

    const target =
      (savedId && (notes.find((n) => String(n.id) === savedId) ||
                   sharedNotes.find((n) => String(n.id) === savedId))) ||
      (window.innerWidth >= 640 ? notes[0] : null); // desktop fallback

    if (target) useNoteStore.getState().setActiveNote(target.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length, activeNoteId]);

  const handleOpenNote = useCallback((noteId) => {
    useNoteStore.getState().setActiveNote(noteId);
    setMobilePanel("editor");
  }, []);

  const handleDeleteNote = useCallback((note) => {
    setDeleteTarget(note);
  }, []);

  // FAB: create a new note and immediately open the editor on mobile
  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    if (note?.id) {
      setActiveNote(note.id);
      setMobilePanel("editor");
    }
  }, [createNote, setActiveNote]);

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

  const needsUnlock =
    activeNote?.hasPassword && !unlockedNoteIds.has(activeNote.id);

  const showVerifyBanner =
    user && !user.isVerified && !verifyBannerDismissed;

  const mobileNavItems = [
    { id: "recents",   label: "Notes",  icon: FileText },
    { id: "favorites", label: "Pinned", icon: Star },
    { id: "shared",    label: "Shared", icon: Users },
  ];

  return (
    <div className="h-screen flex flex-col bg-dark-500 overflow-hidden">

      {/* ── Email verification banner ── */}
      {showVerifyBanner && (
        <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between gap-2 text-amber-300 text-xs animate-slide-down"
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
          }}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span className="truncate">
              Please verify your email{" "}
              <strong className="font-semibold">{user.email}</strong> to secure your account.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleResend}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: "rgba(245,158,11,0.18)" }}
            >
              <Mail size={11} />
              Resend
            </button>
            <button
              onClick={() => setVerifyBannerDismissed(true)}
              className="text-amber-300/60 hover:text-amber-200 transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">

        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm animate-fade-in-up"
            style={{ animation: "fadeInUp 150ms ease both" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <div
          className={`fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto sidebar-container ${
            sidebarOpen
              ? "translate-x-0 lg:flex-shrink-0"
              : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
          }`}
          style={{
            // On desktop: when closed, collapse to 0 width
            width: sidebarOpen ? "var(--sidebar-width, 260px)" : undefined,
          }}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top bar */}
          <header
            className="flex-shrink-0 h-12 flex items-center justify-between px-3 sm:px-4"
            style={{
              background: "rgb(var(--dark-600))",
              borderBottom: "1px solid rgba(var(--dark-300), 0.8)",
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile hamburger */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-all duration-150 flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                <Menu size={17} />
              </button>

              {/* Desktop collapse button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg text-dark-50 hover:text-surface-200 hover:bg-dark-200 transition-all duration-150 flex-shrink-0"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
              </button>

              {/* Breadcrumb */}
              <nav className="hidden sm:flex items-center gap-1 text-sm text-dark-50 min-w-0">
                <span className="font-medium">Notes</span>
                {activeNote && (
                  <>
                    <ChevronRight size={11} className="flex-shrink-0 opacity-50" />
                    <span className="text-surface-200 truncate max-w-[180px] md:max-w-[280px]">
                      {activeNote.title || "Untitled"}
                    </span>
                  </>
                )}
              </nav>

              {/* Mobile back button (in editor panel) */}
              {mobilePanel === "editor" && activeNote && (
                <button
                  onClick={() => setMobilePanel("list")}
                  className="sm:hidden flex items-center gap-1 text-sm text-dark-50 hover:text-surface-200 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {!isOnline && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ background: "rgba(245,158,11,0.12)", color: "rgb(252 211 77)" }}
                title={lastSyncTime ? `Last synced: ${lastSyncTime.toLocaleTimeString()}` : "Not yet synced"}
              >
                <WifiOff size={11} />
                <span className="hidden sm:inline">
                  Offline{pendingCount > 0 ? ` · ${pendingCount} queued` : ""}
                </span>
              </span>
            )}
              {isOnline && pendingCount > 0 && (
                <button
                  onClick={flushQueue}
                  disabled={syncing}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors disabled:opacity-60"
                  style={{ background: "rgba(59,130,246,0.12)", color: "rgb(147 197 253)" }}
                  title="Sync pending changes"
                >
                  <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
                  <span className="hidden sm:inline">{syncing ? "Syncing…" : `${pendingCount} pending`}</span>
                </button>
              )}

              {/* User dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-dark-200 transition-all duration-150">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-accent-400 text-xs font-semibold"
                      style={{ background: "rgba(99,102,241,0.18)" }}>
                      {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm text-surface-200">
                    {user?.displayName || "User"}
                  </span>
                </button>

                {/* Dropdown menu */}
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl py-1.5 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 animate-scale-in"
                  style={{
                    background: "rgb(var(--dark-200))",
                    border: "1px solid rgba(var(--dark-100), 0.7)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
                  }}
                >
                  <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(var(--dark-300), 0.6)" }}>
                    <p className="text-sm font-semibold text-surface-100 truncate">
                      {user?.displayName || "User"}
                    </p>
                    <p className="text-xs text-dark-50 truncate mt-0.5">{user?.email}</p>
                  </div>
                  {[
                    { to: "/profile", label: "Profile" },
                    { to: "/preferences", label: "Preferences" },
                    { to: "/change-password", label: "Change password" },
                  ].map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      className="block px-4 py-2 text-sm text-surface-200 hover:bg-dark-100 transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-dark-100 transition-colors mt-1"
                    style={{ borderTop: "1px solid rgba(var(--dark-300), 0.5)" }}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* ── List + Editor panel ── */}
          {/* On mobile: panels are stacked absolutely and slide via translateX.
              On desktop (sm+): normal side-by-side flex layout. */}
          <div className="flex-1 overflow-hidden relative sm:flex">

            {/* NoteList – slides left when editor opens on mobile */}
            <div
              className={`
                absolute inset-0 z-10
                sm:relative sm:inset-auto sm:z-auto sm:flex-shrink-0 sm:h-full
                transition-transform duration-300 ease-in-out
                ${mobilePanel === "editor" ? "-translate-x-full sm:translate-x-0" : "translate-x-0"}
              `}
            >
              <ErrorBoundary>
                <NoteList
                  onOpenNote={handleOpenNote}
                  onDeleteNote={handleDeleteNote}
                />
              </ErrorBoundary>
            </div>

            {/* Editor – slides in from the right on mobile */}
            <div
              className={`
                absolute inset-0 z-10 flex flex-col
                sm:relative sm:inset-auto sm:z-auto sm:flex-1 sm:min-w-0 sm:h-full
                transition-transform duration-300 ease-in-out
                ${mobilePanel === "list" ? "translate-x-full sm:translate-x-0" : "translate-x-0"}
              `}
            >
              {isLoading ? (
                <div className="flex-1 p-4 sm:p-6 grid gap-3 grid-cols-1">
                  {[...Array(5)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : activeNote ? (
                needsUnlock ? (
                  <UnlockOverlay note={activeNote} />
                ) : (
                  <ErrorBoundary>
                    <NoteEditor
                      note={activeNote}
                      onClose={() => {
                        useNoteStore.getState().setActiveNote(null);
                        setMobilePanel("list");
                      }}
                    />
                  </ErrorBoundary>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-dark-50 p-4">
                  <div className="text-center animate-fade-in-up">
                    <div
                      className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(var(--dark-200), 0.8)" }}
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" className="text-dark-50/80">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-base font-display font-medium text-surface-200 mb-1.5">
                      Select a note to view
                    </h3>
                    <p className="text-sm text-dark-50/70 max-w-xs leading-relaxed">
                      Choose a note from the list, or create a new one to get started.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── FAB: New Note (mobile only, hidden when editor is open) ── */}
      {mobilePanel === "list" && (
        <button
          onClick={handleNewNote}
          className="fixed sm:hidden z-50 flex items-center justify-center animate-fab-pop active:scale-90 transition-transform"
          style={{
            bottom: "calc(var(--bottom-nav-height, 60px) + 16px)",
            right: "16px",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgb(99 102 241), rgb(79 70 229))",
            boxShadow: "0 4px 20px rgba(99, 102, 241, 0.5)",
            color: "white",
          }}
          aria-label="New note"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* ── Mobile bottom navigation ── */}
      <div className="mobile-bottom-nav sm:hidden">
        {mobileNavItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveSection(id);
                if (id === "shared") refreshSharedWithMe();
                setMobilePanel("list");
                useNoteStore.getState().setActiveNote(null);
              }}
              className={`mobile-nav-btn ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Modals ── */}
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
