import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit3, Eye, EyeOff } from "lucide-react";
import useAuthStore from "../store/useAuthStore";

const Login = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    const result = await login(formData);
    if (result.success) {
      navigate("/");
    } else if (result.errors) {
      setFieldErrors(
        Object.fromEntries(
          Object.entries(result.errors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v[0] : v,
          ]),
        ),
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="auth-orb-1" />
      <div className="auth-orb-2" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-transform hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.06))",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            <Edit3 size={22} className="text-accent-400" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-surface-100 italic">
            NoteFlow
          </h1>
          <p className="mt-1.5 text-sm text-dark-50">Welcome back! Sign in to continue.</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 space-y-4 animate-slide-in-right"
          style={{
            background: "rgba(var(--dark-300), 0.85)",
            border: "1px solid rgba(var(--dark-100), 0.5)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          {error?.message && (
            <div
              className="p-3 rounded-xl text-sm animate-slide-down"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "rgb(248 113 113)",
              }}
            >
              {error.message}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-200 mb-1.5">
              Email
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={formData.email} onChange={handleChange}
              className={`input-dark ${fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""}`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface-200 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password" required
                value={formData.password} onChange={handleChange}
                className={`input-dark pr-10 ${fieldErrors.password ? "border-red-500 focus:ring-red-500" : ""}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-50 hover:text-surface-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          {/* Forgot password */}
          <div className="text-right -mt-1">
            <Link
              to="/forgot-password"
              className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary w-full mt-1"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : "Sign in"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-dark-50">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-semibold text-accent-400 hover:text-accent-300 transition-colors">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
