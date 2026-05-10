import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/useAuthStore";
import useNoteStore from "./store/useNoteStore";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ResetPasswordOtp from "./pages/ResetPasswordOtp";
import EmailVerified from "./pages/EmailVerified";
import Profile from "./pages/Profile";
import Preferences from "./pages/Preferences";
import ChangePassword from "./pages/ChangePassword";

function App() {
  const user = useAuthStore((s) => s.user);
  const setViewMode = useNoteStore((s) => s.setViewMode);

  useEffect(() => {
    const prefs = user?.preferences || { theme: "dark", font_size: 16 };
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
    </BrowserRouter>
  );
}

export default App;
