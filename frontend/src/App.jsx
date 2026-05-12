import { useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/useAuthStore";
import useNoteStore from "./store/useNoteStore";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────
// Only Dashboard is on the critical path. All other pages are loaded on
// demand, reducing the initial bundle by ~40-60 KB.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ResetPasswordOtp = lazy(() => import("./pages/ResetPasswordOtp"));
const EmailVerified = lazy(() => import("./pages/EmailVerified"));
const Profile = lazy(() => import("./pages/Profile"));
const Preferences = lazy(() => import("./pages/Preferences"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

/** Minimal full-screen loader shown while lazy chunks are fetched. */
const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-dark-500">
    <div className="flex flex-col items-center gap-3 animate-fade-in-up">
      <div
        className="w-8 h-8 rounded-full border-2 border-accent-500 border-t-transparent animate-spin"
      />
      <span className="text-xs text-dark-50">Loading…</span>
    </div>
  </div>
);

function App() {
  const user = useAuthStore((s) => s.user);
  const setViewMode = useNoteStore((s) => s.setViewMode);

  useEffect(() => {
    const prefs = user?.preferences || { theme: "system", font_size: 16 };
    const root = document.documentElement;

    if (prefs.theme === "dark") {
      root.classList.add("dark");
    } else if (prefs.theme === "light") {
      root.classList.remove("dark");
    } else {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      if (m.matches) root.classList.add("dark");
      else root.classList.remove("dark");
    }
    
    document.body.style.fontSize = `${prefs.font_size || 16}px`;

    // Sync default_view preference to note store
    if (prefs.default_view) {
      const savedLocal = localStorage.getItem("noteflow.viewMode");
      // Only apply user preference if no local override exists
      if (!savedLocal) {
        setViewMode(prefs.default_view);
      }
    }
  }, [user?.preferences, setViewMode]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#1f1f23",
            color: "#f1f1f3",
            border: "1px solid #2c2c33",
            fontSize: "13px",
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/otp" element={<ResetPasswordOtp />} />
          </Route>

          {/* Email verification can be visited while authenticated or not. */}
          <Route path="/email-verified" element={<EmailVerified />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>

          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
